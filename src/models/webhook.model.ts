import { EnduranceSchema, EnduranceModelType } from '@programisto/endurance';

function isValidURL(url: string): boolean {
    const regex = /^(ftp|http|https):\/\/[^ "]+$/;
    return regex.test(url);
}

class Webhook extends EnduranceSchema {
    @EnduranceModelType.prop({
        required: true,
        validate: {
            validator: (url: string) => isValidURL(url),
            message: 'URL invalide'
        }
    })
    public url!: string;

    @EnduranceModelType.prop({ required: true })
    public event!: string;

    @EnduranceModelType.prop({ required: false, default: Date.now })
    public created_at!: Date;
}

// Génération du modèle et export
const WebhookModel = Webhook.getModel();
export default WebhookModel;
