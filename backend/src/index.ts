import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { generateRoute } from './routes/generate';
import { jobsRoute } from './routes/jobs';
import { downloadRoute } from './routes/download';
import './queue/worker';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 4000);

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }));
app.use(express.json());

app.use('/api/generate', generateRoute);
app.use('/api/jobs', jobsRoute);
app.use('/api/download', downloadRoute);

app.get('/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.listen(PORT, () => console.log(`Savra backend running on port ${PORT}`));