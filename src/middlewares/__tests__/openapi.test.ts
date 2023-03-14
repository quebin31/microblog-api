import { buildExpressParams } from '../../test/express';
import { serveOpenApiDocs } from '../openapi';
import path from 'path';

describe('Serve OpenAPI docs', () => {
  test('sends built docs file', () => {
    const { req, res } = buildExpressParams();
    serveOpenApiDocs(req, res);

    expect(res.sendFile).toHaveBeenCalledTimes(1)
    const expectedPath = path.join(process.cwd(), 'build/redoc.html');
    expect(res.sendFile).toHaveBeenCalledWith(expectedPath);
  });
});
