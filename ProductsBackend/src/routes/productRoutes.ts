import express, {Request, Response} from 'express';
import redisClient from '../redisClient';

interface product{
    id : number,
    name : string,
    price : number,
    description : string
}

let products : product[] = [{ id: 1, name: 'Smartphone X1', price: 699, description: 'A high-end smartphone with a powerful processor and stunning display.' },
                            { id: 2, name: 'Laptop Pro 15', price: 1299, description: 'A professional laptop with a 15-inch display and long battery life.' },
                            { id: 3, name: 'Wireless Headphones', price: 199, description: 'Noise-canceling wireless headphones with superior sound quality.' },
                            { id: 4, name: 'Smartwatch Series 5', price: 299, description: 'A smartwatch with health tracking features and customizable watch faces.' },
                            { id: 5, name: '4K TV 55"', price: 799, description: 'A 55-inch 4K Ultra HD TV with vibrant colors and smart features.' },
                            { id: 6, name: 'Gaming Console Z', price: 499, description: 'A next-gen gaming console with immersive graphics and fast performance.' },
                            { id: 7, name: 'Bluetooth Speaker', price: 99, description: 'A portable Bluetooth speaker with deep bass and water-resistant design.' },
                            { id: 8, name: 'Fitness Tracker', price: 149, description: 'A fitness tracker with heart rate monitoring and sleep analysis features.' },
                            { id: 9, name: 'Drone X500', price: 899, description: 'A high-performance drone with 4K camera and long flight time.' },
                            { id: 10, name: 'E-Reader Plus', price: 249, description: 'An e-reader with a high-resolution display and adjustable backlight.' }]

const router = express.Router();

router.post('/createProduct',(req : Request, res : Response)=>{
    try{
        const id : number = req.body.id;
        const name : string = req.body.name;
        const price : number = req.body.price;
        const description : string = req.body.description;
    
        const item : product = {
            id,
            name,
            price,
            description
        } 

        products.push(item);
        res.status(200).json({
            ItemInserted : item,
            message : "Product Inserted Successfully"
        })
    }
    catch(err){
        res.status(403).json({
            message : err
        })
    }
});

router.get('/getProducts', (req : Request, res : Response) =>{
    try{
        if(products.length == 0){
            res.status(403).json({
                message : "No products to view"
            })
            return
        }
        res.status(200).json({
            products
        })
    }

    catch(err){
        res.status(403).json({
            message : err
        })
    }
});

//get a specific product
router.get('/getProduct/:id', async (req : Request, res: Response)=>{
    try{
        const pid  = parseInt(req.params.id, 10);

        if(isNaN(pid)){
            throw new Error("The id is not a number");
        }

        const product_key =  `product:${pid}`
        const cachedProduct = await redisClient.get(product_key);

        if(cachedProduct){
            return res.status(200).json({
                message : "Product found in the cache",
                product : JSON.parse(cachedProduct)
            });
        }

        const productIndex = products.findIndex((p)=> p.id == pid);

        if(productIndex != -1){
            const product = products[productIndex];

            await redisClient.set(product_key, JSON.stringify(product), {EX : 300});

            return res.status(200).json({
                message : "Found the product",
                product : product
            })
            
        }
        res.status(404).json({
            message : "Product not found"
        })
    }
    catch(err:any){
        res.status(400).json({
            error:err.message
        })
    }
})

//updateProduct
router.put('/updateProduct/:id', async (req : Request, res : Response)=>{
    try{
        const pid :number = parseInt(req.params.id, 10);

        const {name, price, description} = req.body;

        const product_key = `product:${pid}`;

        const productIndex :number = products.findIndex((p)=> p.id == pid);
        
        if(productIndex != -1){
            const existingProduct = products[productIndex];

            if (name !== undefined) existingProduct.name = name;
            if (price !== undefined) existingProduct.price = price;
            if (description !== undefined) existingProduct.description = description;

            await redisClient.set(product_key, JSON.stringify(existingProduct), {EX : 300});

            return res.status(200).json({
                message : "Updated Succefully",
                Product : existingProduct
            }) 
        }
        else{
            res.status(404).json({
                message : "Product not found!!"
            })
        }
    }
    catch(err){
        res.status(404).json({
            error : err
        })
    }
    
});

//deleteRoute
router.delete('/deleteProduct/:id', async (req: Request, res: Response)=>{
    try{
        const pid : number = parseInt(req.params.id, 10);
        const productIndex : number = products.findIndex((p)=> p.id === pid);
        
        if(productIndex == -1){
            return res.status(403).json({
                message : "Product not found"
            })
        }
        products.splice(productIndex, 1);

        //deleting the product form the cache as well
        const productKey = `product:${pid}`

        await redisClient.del(productKey);

        return res.status(200).json({
            message : "Successfully deleted the product"
        })
    }

    catch(err){
        res.status(404).json({
            error : err
        })
    }
});

// deleteRoute
router.delete('/deleteProduct/:id', async (req: Request, res: Response) => {
    try {
        const pid: number = parseInt(req.params.id, 10);
        if (isNaN(pid)) {
            throw new Error("The id is not a valid number");
        }

        const productIndex: number = products.findIndex((p) => p.id === pid);

        if (productIndex === -1) {
            return res.status(403).json({
                message: "Product not found"
            });
        }

        products.splice(productIndex, 1); // Use splice to remove the product

        // deleting the product from the cache as well
        const productKey = `product:${pid}`;

        await redisClient.del(productKey);

        return res.status(200).json({
            message: "Successfully deleted the product"
        });
    } catch (err: any) {
        res.status(404).json({
            error: err.message
        });
    }
});


export default router;