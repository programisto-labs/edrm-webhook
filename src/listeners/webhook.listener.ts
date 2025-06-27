import axios from 'axios';
import listener from 'endurance-core/lib/listener';
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

listener.createAnyListener(async (event: string, data: WebhookEventData) => {
  console.log(`Event received: ${event}`);
  try {
    const webhooks = await Webhook.find({ event }).lean<WebhookData[]>();
    webhooks.forEach((webhook: WebhookData) => {
      callWebhook(webhook, event, data).catch((err) => {
        console.error(`Error in calling webhook: ${webhook.url}`, err);
      });
    });
  } catch (err) {
    console.error(`Error processing event: ${event}`, err);
  }
});

console.log('Webhook listener initialized');

export default listener;
