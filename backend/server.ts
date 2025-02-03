import express from 'express';
import fundamentalsRoutes from './routes/fundamentals.routes';

const app = express();
app.use(express.json());
app.use('/api/fundamentals', fundamentalsRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});