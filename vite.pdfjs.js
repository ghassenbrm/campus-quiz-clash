import { readFileSync } from 'fs';
import { join } from 'path';

export default function pdfjsWorker() {
  return {
    name: 'pdfjs-worker',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/pdf.worker.js') {
          const workerPath = require.resolve('pdfjs-dist/legacy/build/pdf.worker.js');
          const workerCode = readFileSync(workerPath, 'utf-8');
          res.setHeader('Content-Type', 'application/javascript');
          res.end(workerCode);
        } else {
          next();
        }
      });
    },
  };
}
