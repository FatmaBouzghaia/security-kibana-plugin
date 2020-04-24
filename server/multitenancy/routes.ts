/*
 *   Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 *   Licensed under the Apache License, Version 2.0 (the "License").
 *   You may not use this file except in compliance with the License.
 *   A copy of the License is located at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *   or in the "license" file accompanying this file. This file is distributed
 *   on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 *   express or implied. See the License for the specific language governing
 *   permissions and limitations under the License.
 */

import { IRouter, SessionStorageFactory } from '../../../../src/core/server';
import { schema } from '@kbn/config-schema';
import { SecuritySessionCookie } from '../session/security_cookie';
import { SecurityClient } from '../backend/opendistro_security_client';

export function setupMultitenantRoutes(
  router: IRouter,
  sessionStroageFactory: SessionStorageFactory<SecuritySessionCookie>,
  securityClient: SecurityClient
) {
  const PREFIX: string = '/api/v1';

  // Updates selected tenant in cookie
  router.post(
    {
      path: `${PREFIX}/multitenancy/tenant`,
      validate: {
        body: schema.object({
          username: schema.string(),
          tenant: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      const tenant = request.body.tenant;

      let cookie: SecuritySessionCookie | null = await sessionStroageFactory
        .asScoped(request)
        .get();
      if (!cookie) {
        return response.badRequest({
          body: 'Invalid cookie',
        });
      }
      cookie.tentent = tenant;
      sessionStroageFactory.asScoped(request);
      return response.ok({
        body: tenant,
      });
    }
  );

  // Gets preferred tenant from cookie
  router.get(
    {
      path: `${PREFIX}/multitenancy/tenant`,
      validate: false,
    },
    async (context, request, response) => {
      const cookie = await sessionStroageFactory.asScoped(request).get();
      if (!cookie) {
        return response.badRequest({
          body: 'Invalid cookie.',
        });
      }
      return response.ok({
        body: cookie.tentent,
      });
    }
  );

  router.get(
    {
      path: `${PREFIX}/multitenancy/info`,
      validate: false,
    },
    async (context, request, response) => {
      try {
        const esResponse = await securityClient.getMultitenancyInfo(request);
        return response.ok({
          body: esResponse.body,
          headers: {
            'content-type': 'application/json',
          },
        });
      } catch (error) {
        return response.internalError({
          body: error.message,
        });
      }
    }
  );

  router.post(
    {
      // FIXME: Seems this is not being used, confirm and delete if not used anymore
      path: `${PREFIX}/multitenancy/migrate/{tenantindex}`,
      validate: {
        params: schema.object({
          tenantindex: schema.string(),
        }),
        query: schema.object({
          force: schema.literal('true'),
        }),
      },
    },
    async (context, request, response) => {
      return response.ok(); // TODO: implement tenant index migration logic
    }
  );
}
