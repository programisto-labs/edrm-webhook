export type WebhookFilterValueType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'null'
  | 'string_array'
  | 'number_array'
  | 'boolean_array';

export type WebhookFilterOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'contains'
  | 'in'
  | 'exists'
  | 'not_exists';

export interface WebhookFilterCondition {
  kind: 'condition';
  path: string;
  operator: WebhookFilterOperator;
  value?: string | number | boolean | null | Array<string | number | boolean | null>;
  valueType?: WebhookFilterValueType;
}

export interface WebhookFilterGroup {
  kind: 'group';
  operator: 'and' | 'or';
  children: Array<WebhookFilterGroup | WebhookFilterCondition>;
}

export type WebhookFilterNode = WebhookFilterGroup | WebhookFilterCondition;

export interface WebhookPayloadFilter {
  version: 1;
  root: WebhookFilterGroup;
}

export interface WebhookSubscription {
  event: string;
  filter?: WebhookPayloadFilter | null;
}

const MAX_FILTER_DEPTH = 5;
const MAX_FILTER_NODE_COUNT = 50;
const MAX_PATH_LENGTH = 120;
const MAX_STRING_LENGTH = 500;
const MAX_ARRAY_LENGTH = 50;
const PAYLOAD_PATH_RE = /^[A-Za-z0-9_-]+(?:\[(?:0|[1-9]\d*)\]|\.[A-Za-z0-9_-]+)*$/;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isScalar(value: unknown): value is string | number | boolean | null {
  return (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  );
}

function normalizeValueType(value: unknown): WebhookFilterValueType | undefined {
  if (typeof value !== 'string') return undefined;
  switch (value) {
    case 'string':
    case 'number':
    case 'boolean':
    case 'null':
    case 'string_array':
    case 'number_array':
    case 'boolean_array':
      return value;
    default:
      return undefined;
  }
}

function assertArrayValueMatchesType(value: Array<string | number | boolean | null>, valueType?: WebhookFilterValueType) {
  if (valueType === 'number_array' && !value.every((item) => typeof item === 'number')) {
    throw new Error('Le filtre webhook attend une liste de nombres.');
  }
  if (valueType === 'boolean_array' && !value.every((item) => typeof item === 'boolean')) {
    throw new Error('Le filtre webhook attend une liste de booléens.');
  }
  if (valueType === 'string_array' && !value.every((item) => typeof item === 'string')) {
    throw new Error('Le filtre webhook attend une liste de textes.');
  }
}

function assertScalarValueMatchesType(
  value: string | number | boolean | null,
  valueType?: WebhookFilterValueType,
  operator?: WebhookFilterOperator
) {
  if ((operator === 'gt' || operator === 'gte' || operator === 'lt' || operator === 'lte') && typeof value !== 'number') {
    throw new Error(`L'opérateur "${operator}" attend une valeur numérique.`);
  }
  if (valueType === 'number' && typeof value !== 'number') {
    throw new Error('Le filtre webhook attend une valeur numérique.');
  }
  if (valueType === 'boolean' && typeof value !== 'boolean') {
    throw new Error('Le filtre webhook attend une valeur booléenne.');
  }
  if (valueType === 'string' && typeof value !== 'string') {
    throw new Error('Le filtre webhook attend une valeur texte.');
  }
  if (valueType === 'null' && value !== null) {
    throw new Error('Le filtre webhook attend la valeur null.');
  }
}

function normalizeCondition(
  input: Record<string, unknown>,
  depth: number,
  state: { nodes: number }
): WebhookFilterCondition {
  if (depth > MAX_FILTER_DEPTH) {
    throw new Error(`Le filtre webhook dépasse la profondeur maximale de ${MAX_FILTER_DEPTH}.`);
  }
  state.nodes += 1;
  if (state.nodes > MAX_FILTER_NODE_COUNT) {
    throw new Error(`Le filtre webhook dépasse ${MAX_FILTER_NODE_COUNT} nœuds.`);
  }

  const rawPath = typeof input.path === 'string' ? input.path.trim() : '';
  if (!rawPath) throw new Error('Chaque condition de filtre doit définir un chemin.');
  if (rawPath.length > MAX_PATH_LENGTH) throw new Error(`Le chemin "${rawPath}" est trop long.`);
  if (!PAYLOAD_PATH_RE.test(rawPath)) {
    throw new Error(`Le chemin "${rawPath}" utilise une syntaxe non supportée.`);
  }

  const rawOperator = typeof input.operator === 'string' ? input.operator : '';
  const operator = [
    'eq',
    'neq',
    'gt',
    'gte',
    'lt',
    'lte',
    'contains',
    'in',
    'exists',
    'not_exists'
  ].includes(rawOperator)
    ? rawOperator as WebhookFilterOperator
    : null;
  if (!operator) throw new Error(`L'opérateur "${rawOperator}" est invalide.`);

  const valueType = normalizeValueType(input.valueType);
  const base: WebhookFilterCondition = {
    kind: 'condition',
    path: rawPath,
    operator,
    ...(valueType ? { valueType } : {})
  };

  if (operator === 'exists' || operator === 'not_exists') {
    return base;
  }

  const rawValue = input.value;
  if (operator === 'in') {
    if (!Array.isArray(rawValue) || rawValue.length === 0) {
      throw new Error('L’opérateur "in" attend une liste non vide.');
    }
    if (rawValue.length > MAX_ARRAY_LENGTH) {
      throw new Error(`L’opérateur "in" accepte au maximum ${MAX_ARRAY_LENGTH} valeurs.`);
    }
    if (!rawValue.every(isScalar)) {
      throw new Error('Les listes du filtre webhook doivent contenir uniquement des scalaires.');
    }
    rawValue.forEach((item) => {
      if (typeof item === 'string' && item.length > MAX_STRING_LENGTH) {
        throw new Error('Une valeur du filtre webhook est trop longue.');
      }
    });
    assertArrayValueMatchesType(rawValue, valueType);
    return {
      ...base,
      value: rawValue
    };
  }

  if (!isScalar(rawValue)) {
    throw new Error(`L'opérateur "${operator}" attend une valeur scalaire.`);
  }
  if (typeof rawValue === 'string' && rawValue.length > MAX_STRING_LENGTH) {
    throw new Error('Une valeur du filtre webhook est trop longue.');
  }
  assertScalarValueMatchesType(rawValue, valueType, operator);
  if (operator === 'contains' && rawValue === null) {
    throw new Error('L’opérateur "contains" n’accepte pas la valeur null.');
  }

  return {
    ...base,
    value: rawValue
  };
}

function normalizeGroup(
  input: Record<string, unknown>,
  depth: number,
  state: { nodes: number }
): WebhookFilterGroup {
  if (depth > MAX_FILTER_DEPTH) {
    throw new Error(`Le filtre webhook dépasse la profondeur maximale de ${MAX_FILTER_DEPTH}.`);
  }
  state.nodes += 1;
  if (state.nodes > MAX_FILTER_NODE_COUNT) {
    throw new Error(`Le filtre webhook dépasse ${MAX_FILTER_NODE_COUNT} nœuds.`);
  }

  const operator = input.operator === 'or' ? 'or' : input.operator === 'and' ? 'and' : null;
  if (!operator) throw new Error('Chaque groupe de filtre doit définir AND ou OR.');

  const rawChildren = Array.isArray(input.children) ? input.children : null;
  if (!rawChildren || rawChildren.length === 0) {
    throw new Error('Chaque groupe de filtre doit contenir au moins un enfant.');
  }

  return {
    kind: 'group',
    operator,
    children: rawChildren.map((child) => normalizeFilterNode(child, depth + 1, state))
  };
}

function normalizeFilterNode(
  input: unknown,
  depth: number,
  state: { nodes: number }
): WebhookFilterNode {
  if (!isPlainObject(input)) {
    throw new Error('Le filtre webhook contient un nœud invalide.');
  }
  if (input.kind === 'group') return normalizeGroup(input, depth, state);
  if (input.kind === 'condition') return normalizeCondition(input, depth, state);
  throw new Error('Le filtre webhook contient un type de nœud invalide.');
}

export function normalizeWebhookPayloadFilter(input: unknown): WebhookPayloadFilter | undefined {
  if (input == null) return undefined;
  if (!isPlainObject(input)) throw new Error('Le filtre webhook doit être un objet.');
  if (input.version !== 1) throw new Error('Seule la version 1 des filtres webhook est supportée.');
  if (!isPlainObject(input.root)) throw new Error('Le filtre webhook doit définir un groupe racine.');
  const state = { nodes: 0 };
  return {
    version: 1,
    root: normalizeGroup(input.root, 0, state)
  };
}

function parseEvent(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

export function normalizeWebhookSubscriptions(
  subscriptionsInput: unknown,
  eventsInput?: unknown
): WebhookSubscription[] {
  if (Array.isArray(subscriptionsInput)) {
    const normalized: WebhookSubscription[] = [];
    const seenEvents = new Set<string>();
    for (const item of subscriptionsInput) {
      if (!isPlainObject(item)) {
        throw new Error('Chaque souscription webhook doit être un objet.');
      }
      const event = parseEvent(item.event);
      if (!event) {
        throw new Error('Chaque souscription webhook doit définir un événement.');
      }
      if (seenEvents.has(event)) continue;
      seenEvents.add(event);
      normalized.push({
        event,
        ...(item.filter != null ? { filter: normalizeWebhookPayloadFilter(item.filter) ?? null } : {})
      });
    }
    return normalized;
  }

  if (!Array.isArray(eventsInput)) return [];
  const normalized: WebhookSubscription[] = [];
  const seenEvents = new Set<string>();
  for (const rawEvent of eventsInput) {
    const event = parseEvent(rawEvent);
    if (!event || seenEvents.has(event)) continue;
    seenEvents.add(event);
    normalized.push({ event });
  }
  return normalized;
}

export function deriveWebhookEvents(subscriptions: WebhookSubscription[]): string[] {
  return Array.from(new Set(subscriptions.map((subscription) => subscription.event)));
}

function getPathSegments(path: string): string[] {
  return path.replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean);
}

function getValueAtPath(payload: Record<string, unknown>, path: string): unknown {
  let current: unknown = payload;
  for (const segment of getPathSegments(path)) {
    if (current == null) return undefined;
    if (Array.isArray(current)) {
      const index = Number(segment);
      if (!Number.isInteger(index)) return undefined;
      current = current[index];
      continue;
    }
    if (typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

function valuesAreEqual(left: unknown, right: unknown): boolean {
  return left === right;
}

function evaluateCondition(condition: WebhookFilterCondition, payload: Record<string, unknown>): boolean {
  const actualValue = getValueAtPath(payload, condition.path);

  if (condition.operator === 'exists') return actualValue !== undefined;
  if (condition.operator === 'not_exists') return actualValue === undefined;
  if (actualValue === undefined) return false;

  const expectedValue = condition.value;

  switch (condition.operator) {
    case 'eq':
      return valuesAreEqual(actualValue, expectedValue);
    case 'neq':
      return !valuesAreEqual(actualValue, expectedValue);
    case 'gt':
      return typeof actualValue === 'number' && typeof expectedValue === 'number' && actualValue > expectedValue;
    case 'gte':
      return typeof actualValue === 'number' && typeof expectedValue === 'number' && actualValue >= expectedValue;
    case 'lt':
      return typeof actualValue === 'number' && typeof expectedValue === 'number' && actualValue < expectedValue;
    case 'lte':
      return typeof actualValue === 'number' && typeof expectedValue === 'number' && actualValue <= expectedValue;
    case 'contains':
      if (typeof actualValue === 'string' && typeof expectedValue === 'string') {
        return actualValue.includes(expectedValue);
      }
      if (Array.isArray(actualValue)) {
        return actualValue.some((item) => valuesAreEqual(item, expectedValue));
      }
      return false;
    case 'in':
      return Array.isArray(expectedValue) && expectedValue.some((item) => valuesAreEqual(actualValue, item));
    default:
      return false;
  }
}

function evaluateNode(node: WebhookFilterNode, payload: Record<string, unknown>): boolean {
  if (node.kind === 'condition') {
    return evaluateCondition(node, payload);
  }
  if (node.operator === 'and') {
    return node.children.every((child) => evaluateNode(child, payload));
  }
  return node.children.some((child) => evaluateNode(child, payload));
}

export function evaluateWebhookPayloadFilter(
  filter: WebhookPayloadFilter | null | undefined,
  payload: Record<string, unknown>
): boolean {
  if (!filter) return true;
  return evaluateNode(filter.root, payload);
}

export function findMatchingWebhookSubscription(
  webhook: { subscriptions?: unknown; events?: unknown },
  event: string
): WebhookSubscription | undefined {
  const subscriptions = normalizeWebhookSubscriptions(webhook.subscriptions, webhook.events);
  return subscriptions.find((subscription) => subscription.event === event);
}
