import server from './server';
import config from './config';

server.listen(parseInt(config.port), () => {
  console.log(`Listening on http://localhost:${config.port}`);
});
