declare module 'endurance-core' {
    export interface EnduranceRequest {
      body: any;
      [key: string]: any;
    }

    export interface SecurityOptions {
      requireAuth?: boolean;
      permissions?: string[];
    }

    export class EnduranceRouter {
      router: any;
      secure(options: SecurityOptions): any;
      constructor(auth?: any);
    }

    export class EnduranceAuthMiddleware {
      static getInstance(): EnduranceAuthMiddleware;
    }
  }

  declare module 'endurance-core/lib/listener' {
    const listener: {
      createAnyListener: (fn: (event: string, data: any) => void | Promise<void>) => void;
    };
    export default listener;
  }
