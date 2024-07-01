import express from 'express';
import productRoutes from './routes/productRoutes';

const app = express();

app.use(express.json());
app.use('/api/products', productRoutes);

app.listen(5000, ()=>{
    console.log("server is up and running");
});