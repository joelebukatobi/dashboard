import { setupBodySchema, pickSetupValues } from '../schemas/setup.schema.js';
import { mapZodErrorsToFields } from '../schemas/common.schema.js';
import { renderSetupPage } from '../controllers/setup.controller.js';

/**
 * Validate setup wizard POST body and re-render form with field errors on failure.
 */
export function validateSetupBody() {
  return async (request, reply) => {
    const result = setupBodySchema.safeParse(request.body ?? {});

    if (!result.success) {
      const { plainToken, expiresIn } = request.setupToken;

      return renderSetupPage(request, reply, {
        step: 'form',
        token: plainToken,
        expiresIn,
        error: null,
        errors: mapZodErrorsToFields(result.error),
        values: pickSetupValues(request.body),
      });
    }

    request.body = result.data;
  };
}
