import { GET } from '@/app/api/db/route';

describe('/api/db route', () => {
  it('returns 401 if API key is missing or invalid', async () => {
    const request = new Request('http://localhost/api/db');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns success if API key is valid', async () => {
    const request = new Request('http://localhost/api/db?key=dev-secret-key');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('Database opened successfully');
    expect(data.dbPath).toBeDefined();
  });
});
