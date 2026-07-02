import { createStore } from './repositories/in-memory/store';
import { createApp } from './app';

const store = createStore();
const app = createApp(store);
const port = Number(process.env.PORT ?? 3000);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
