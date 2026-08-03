import { Types } from 'mongoose';
import { EnduranceSchema, EnduranceModelType } from '@programisto/endurance';
import type { WebhookSubscription } from '../filtering/webhook-payload-filter.js';

@EnduranceModelType.modelOptions({
    schemaOptions: {
        collection: 'webhooks',
        timestamps: true,
        toObject: { virtuals: true },
        toJSON: { virtuals: true },
        _id: true,
        validateBeforeSave: false,
        strict: false
    },
    options: {
        allowMixed: EnduranceModelType.Severity.ALLOW
    }
})
class Webhook extends EnduranceSchema {
    @EnduranceModelType.prop({ required: true })
    public name!: string;

    @EnduranceModelType.prop({ required: true })
    public url!: string;

    @EnduranceModelType.prop({ type: [String], default: [] })
    public events!: string[];

    @EnduranceModelType.prop({ type: [Object], default: [] })
    public subscriptions!: WebhookSubscription[];

    @EnduranceModelType.prop({ required: true, default: true })
    public isActive!: boolean;

    @EnduranceModelType.prop({ required: false })
    public lastTriggeredAt?: Date;

    /** Identifiant de l'entité (portail multi-entités). Optionnel pour rétrocompatibilité. */
    @EnduranceModelType.prop({ required: false })
    public entityId?: Types.ObjectId;

    public static getModel() {
        return WebhookModel;
    }
}

const WebhookModel = EnduranceModelType.getModelForClass(Webhook);
export default WebhookModel;
export { Webhook };
