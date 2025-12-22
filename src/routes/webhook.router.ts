import { EnduranceRouter, EnduranceAuthMiddleware, SecurityOptions, EnduranceRequest } from 'endurance-core';
import Webhook from '../models/webhook.model';

class WebhookRouter extends EnduranceRouter {
  constructor() {
    super(EnduranceAuthMiddleware.getInstance());
    this.setupRoutes();
  }

  setupRoutes() {
    const webhookSecurityOptions: SecurityOptions = {
      requireAuth: true,
      permissions: []
    };

    const webhookPermission = process.env.EDRM_MAILER_MAIL_MESSAGE_PERMISSION || '';
    if (webhookPermission) {
      webhookSecurityOptions.permissions?.push(webhookPermission);
    }

    this.secure(webhookSecurityOptions);

    this.router.post('/webhook', async (req: EnduranceRequest, res: any) => {
      try {
        const webhook = new Webhook(req.body);
        const savedWebhook = await webhook.save();
        res.status(201).json(savedWebhook);
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    });

    this.router.get('/webhook', webhookSecurityOptions, async (req: EnduranceRequest, res: any) => {
      try {
        const webhooks = await Webhook.find().sort({ created_at: -1 });
        res.json(webhooks);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    this.router.get('/webhook/:id', webhookSecurityOptions, async (req: EnduranceRequest, res: any) => {
      try {
        const webhook = await Webhook.findById(req.params.id);
        if (!webhook) {
          return res.status(404).json({ error: 'Webhook non trouvé' });
        }
        res.json(webhook);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    this.router.put('/webhook/:id', webhookSecurityOptions, async (req: EnduranceRequest, res: any) => {
      try {
        const webhook = await Webhook.findByIdAndUpdate(
          req.params.id,
          req.body,
          { new: true, runValidators: true }
        );
        if (!webhook) {
          return res.status(404).json({ error: 'Webhook non trouvé' });
        }
        res.json(webhook);
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    });

    this.router.delete('/webhook/:id', webhookSecurityOptions, async (req: EnduranceRequest, res: any) => {
      try {
        const webhook = await Webhook.findByIdAndDelete(req.params.id);
        if (!webhook) {
          return res.status(404).json({ error: 'Webhook non trouvé' });
        }
        res.json({ message: 'Webhook supprimé avec succès' });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    this.secure({ requireAuth: false });
    this.router.post('/webhook/test', (req: any, res: any) => {
      console.log('Webhook test reçu:', req.body);
      res.status(200).send('OK');
    });
  }
}

export default new WebhookRouter();
