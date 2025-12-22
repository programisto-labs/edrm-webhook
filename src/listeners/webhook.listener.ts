import axios from 'axios';
import { enduranceListener } from '@programisto/endurance';
import Webhook from '../models/webhook.model';

interface WebhookData {
  url: string;
  event: string;
}

type WebhookEventData = Record<string, unknown>;

const callWebhook = async (webhook: WebhookData, event: string, data: WebhookEventData) => {
  try {
    const response = await axios.post(webhook.url, { event, data });
    console.log(`Webhook called: ${webhook.url} for event: ${event}, Response: ${response.status}`);
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        console.error(`Webhook call failed: ${webhook.url}, Status: ${error.response.status}, Data: ${error.response.data}`);
      } else if (error.request) {
        console.error(`Webhook call failed: ${webhook.url}, No response received`);
      } else {
        console.error(`Webhook call failed: ${webhook.url}, Error: ${error.message}`);
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

    const webhooks = await Webhook.find({ event }).lean();
    const webhookList = webhooks as WebhookData[];

    webhookList.forEach((webhook: WebhookData) => {
      callWebhook(webhook, event, data).catch((err) => {
        console.error('Error in calling webhook', {
          error: err instanceof Error ? err.message : err,
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
