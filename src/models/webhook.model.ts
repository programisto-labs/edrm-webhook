import { EnduranceSchema, EnduranceModelType } from '@programisto/endurance';

@EnduranceModelType.modelOptions({
    schemaOptions: {
        collection: 'webhooks',
        timestamps: true,
        toObject: { virtuals: true },
        toJSON: { virtuals: true },
        _id: true,
        validateBeforeSave: false,
        strict: false
    }
})
class Webhook extends EnduranceSchema {
    @EnduranceModelType.prop({ required: true })
    public name!: string;

    @EnduranceModelType.prop({ required: true })
    public url!: string;

    @EnduranceModelType.prop({ type: [String], default: [] })
    public events!: string[];

    @EnduranceModelType.prop({ required: true, default: true })
    public isActive!: boolean;

    @EnduranceModelType.prop({ required: false })
    public lastTriggeredAt?: Date;

    public static getModel() {
        return WebhookModel;
    }
}

const WebhookModel = EnduranceModelType.getModelForClass(Webhook);
export default WebhookModel;
export { Webhook };