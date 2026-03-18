import axios from 'axios';
import { Types } from 'mongoose';
import { enduranceListener } from '@programisto/endurance';
import Webhook from '../models/webhook.model.js';

type WebhookEventData = Record<string, unknown>;

const OBJECT_ID_HEX_LENGTH = 24;
const VALID_OBJECT_ID_HEX = /^[a-fA-F0-9]{24}$/;

/**
 * Normalise entityId (ObjectId ou string) pour la requête.
 * Retourne null si payloadEntityId est null/undefined ou n'est pas un ObjectId valide (ex: "default"),
 * car le schéma Webhook attend un ObjectId et Mongoose échoue en castant une string non-hex.
 */
function toEntityIdFilter(payloadEntityId: unknown): { $in: (Types.ObjectId | string)[] } | null {
  if (payloadEntityId == null) return null;
  if (payloadEntityId instanceof Types.ObjectId) {
    return { $in: [payloadEntityId, payloadEntityId.toString()] };
  }
  const str = String(payloadEntityId);
  if (str.length !== OBJECT_ID_HEX_LENGTH || !VALID_OBJECT_ID_HEX.test(str)) {
    return null;
  }
  const id = new Types.ObjectId(str);
  return { $in: [id, str] };
}

const callWebhook = async (webhook: any, event: string, data: WebhookEventData) => {
  try {
    const response = await axios.post(webhook.url, { event, data });
    console.log(`Webhook called: ${webhook.name} (${webhook.url}) for event: ${event}, Response: ${response.status}`);

    // Mettre à jour lastTriggeredAt après un appel réussi
    webhook.lastTriggeredAt = new Date();
    await webhook.save();
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        console.error(`Webhook call failed: ${webhook.name} (${webhook.url}), Status: ${error.response.status}, Data: ${error.response.data}`);
      } else if (error.request) {
        console.error(`Webhook call failed: ${webhook.name} (${webhook.url}), No response received`);
      } else {
        console.error(`Webhook call failed: ${webhook.name} (${webhook.url}), Error: ${error.message}`);
      }
    } else if (error instanceof Error) {
      console.error(`Unknown error calling webhook: ${error.message}`);
    }
  }
};

enduranceListener.createAnyListener(async (...args: unknown[]) => {
  try {
    // onAny passe généralement (event, ...data) comme paramètres séparés
    if (!args || args.length === 0 || typeof args[0] !== 'string') {
      console.error('Invalid arguments provided to webhook listener', { args });
      return;
    }

    const event = args[0] as string;
    const data = (args.length > 1 ? args[1] : {}) as WebhookEventData;

    // Filtre par entité (multi-entité) : ne déclencher que les webhooks de la même entité que le payload
    const query: Record<string, unknown> = {
      events: event,
      isActive: true
    };
    const payloadEntityId = data?.organizationEntityId ?? data?.entityId;
    if (toEntityIdFilter(payloadEntityId)) {
      query.entityId = toEntityIdFilter(payloadEntityId);
    } else {
      // Événement sans entityId (legacy) → uniquement les webhooks sans entityId
      query.$or = [
        { entityId: null },
        { entityId: { $exists: false } }
      ];
    }

    const webhooks = await Webhook.find(query);

    webhooks.forEach((webhook) => {
      callWebhook(webhook, event, data).catch((err) => {
        console.error('Error in calling webhook', {
          error: err instanceof Error ? err.message : err,
          webhookName: webhook.name,
          webhookUrl: webhook.url,
          event
        });
      });
    });
  } catch (listenerError) {
    console.error('Error in webhook listener', {
      error: listenerError instanceof Error ? listenerError.message : listenerError,
      args
    });
  }
});

export default enduranceListener;
