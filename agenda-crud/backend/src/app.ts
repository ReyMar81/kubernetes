import express from 'express';
import cors from 'cors';
import friendsRouter from './routes/friends.routes';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/friends', friendsRouter);

app.get('/health', (_, res) => res.json({ ok: true }));

export default app;
