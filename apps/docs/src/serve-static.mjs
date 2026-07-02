import express from 'express';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../../../dist/docs/browser');
const app = express();

app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: 'index.html',
  }),
);

app.use((req, res) => {
  res.sendFile(join(browserDistFolder, 'index.csr.html'));
});

const port = process.env['PORT'] || 4000;
app.listen(port, (error) => {
  if (error) throw error;
  console.log(`Static docs server listening on http://localhost:${port}`);
});
