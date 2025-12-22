import { EnduranceRouter, SecurityOptions } from '@programisto/endurance';
import Webhook from '../models/webhook.model.js';

class WebhookRouter extends EnduranceRouter {
  protected setupRoutes(): void {
    const webhookSecurityOptions: SecurityOptions = {
      requireAuth: true,
      permissions: []
    };

    const webhookPermission = process.env.EDRM_MAILER_MAIL_MESSAGE_PERMISSION || '';
    if (webhookPermission) {
      webhookSecurityOptions.permissions?.push(webhookPermission);
    }

    /**
     * @swagger
     * /webhook:
     *   post:
     *     summary: Créer un nouveau webhook
     *     description: Crée un nouveau webhook avec une URL et un événement. Authentification requise.
     *     tags: [Webhook]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [url, event]
     *             properties:
     *               url:
     *                 type: string
     *                 description: URL du webhook (doit être une URL valide)
     *               event:
     *                 type: string
     *                 description: Type d'événement déclenchant le webhook
     *     responses:
     *       201:
     *         description: Webhook créé avec succès
     *       400:
     *         description: Erreur de validation ou URL invalide
     *       500:
     *         description: Erreur serveur
     */
    this.post('/', webhookSecurityOptions, this.createWebhook.bind(this));

    /**
     * @swagger
     * /webhook:
     *   get:
     *     summary: Lister tous les webhooks
     *     description: Récupère la liste de tous les webhooks, triés par date de création décroissante. Authentification requise.
     *     tags: [Webhook]
     *     responses:
     *       200:
     *         description: Liste des webhooks
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 type: object
     *                 properties:
     *                   _id:
     *                     type: string
     *                   url:
     *                     type: string
     *                   event:
     *                     type: string
     *                   created_at:
     *                     type: string
     *                     format: date-time
     *       500:
     *         description: Erreur serveur
     */
    this.get('/', webhookSecurityOptions, this.listWebhooks.bind(this));

    /**
     * @swagger
     * /webhook/{id}:
     *   get:
     *     summary: Récupérer un webhook par ID
     *     description: Récupère les détails d'un webhook spécifique par son identifiant. Authentification requise.
     *     tags: [Webhook]
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *         description: Identifiant du webhook
     *     responses:
     *       200:
     *         description: Détails du webhook
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 _id:
     *                   type: string
     *                 url:
     *                   type: string
     *                 event:
     *                   type: string
     *                 created_at:
     *                   type: string
     *                   format: date-time
     *       404:
     *         description: Webhook non trouvé
     *       500:
     *         description: Erreur serveur
     */
    this.get('/:id', webhookSecurityOptions, this.getWebhookById.bind(this));

    /**
     * @swagger
     * /webhook/{id}:
     *   put:
     *     summary: Mettre à jour un webhook
     *     description: Met à jour les informations d'un webhook existant. Authentification requise.
     *     tags: [Webhook]
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *         description: Identifiant du webhook
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               url:
     *                 type: string
     *                 description: URL du webhook (doit être une URL valide)
     *               event:
     *                 type: string
     *                 description: Type d'événement déclenchant le webhook
     *     responses:
     *       200:
     *         description: Webhook mis à jour avec succès
     *       400:
     *         description: Erreur de validation ou URL invalide
     *       404:
     *         description: Webhook non trouvé
     *       500:
     *         description: Erreur serveur
     */
    this.put('/:id', webhookSecurityOptions, this.updateWebhook.bind(this));

    /**
     * @swagger
     * /webhook/{id}:
     *   delete:
     *     summary: Supprimer un webhook
     *     description: Supprime un webhook par son identifiant. Authentification requise.
     *     tags: [Webhook]
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *         description: Identifiant du webhook
     *     responses:
     *       200:
     *         description: Webhook supprimé avec succès
     *       404:
     *         description: Webhook non trouvé
     *       500:
     *         description: Erreur serveur
     */
    this.delete('/:id', webhookSecurityOptions, this.deleteWebhook.bind(this));

    /**
     * @swagger
     * /webhook/test:
     *   post:
     *     summary: Tester un webhook
     *     description: Route de test pour recevoir des webhooks. Aucune authentification requise.
     *     tags: [Webhook]
     *     requestBody:
     *       required: false
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             additionalProperties: true
     *             description: Données du webhook de test
     *     responses:
     *       200:
     *         description: Webhook reçu avec succès
     */
    this.post('/test', { requireAuth: false }, this.testWebhook.bind(this));
  }

  /**
   * Route POST /
   * Crée un nouveau webhook
   */
  private async createWebhook(req: any, res: any) {
    try {
      const webhook = new Webhook(req.body);
      const savedWebhook = await webhook.save();
      res.status(201).json(savedWebhook);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * Route GET /
   * Liste tous les webhooks
   */
  private async listWebhooks(req: any, res: any) {
    try {
      const webhooks = await Webhook.find().sort({ created_at: -1 });
      res.json(webhooks);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Route GET /:id
   * Récupère un webhook par son ID
   */
  private async getWebhookById(req: any, res: any) {
    try {
      const webhook = await Webhook.findById(req.params.id);
      if (!webhook) {
        return res.status(404).json({ error: 'Webhook non trouvé' });
      }
      res.json(webhook);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Route PUT /:id
   * Met à jour un webhook
   */
  private async updateWebhook(req: any, res: any) {
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
  }

  /**
   * Route DELETE /:id
   * Supprime un webhook
   */
  private async deleteWebhook(req: any, res: any) {
    try {
      const webhook = await Webhook.findByIdAndDelete(req.params.id);
      if (!webhook) {
        return res.status(404).json({ error: 'Webhook non trouvé' });
      }
      res.json({ message: 'Webhook supprimé avec succès' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Route POST /test
   * Route de test pour recevoir des webhooks
   */
  private async testWebhook(req: any, res: any) {
    console.log('Webhook test reçu:', req.body);
    res.status(200).send('OK');
  }
}

export default new WebhookRouter();
