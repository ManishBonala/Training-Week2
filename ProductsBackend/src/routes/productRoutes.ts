import express, {Request, Response, NextFunction} from 'express';
import redisClient from '../redisClient';
import products from '../models/products';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

interface product{
    name : string,
    price : number,
    description : string
}

//connection uri
const uri = process.env.MONGODB_URI || '';

mongoose.connect(uri).then(()=>{
    console.log("Connected to the database");
})

const router = express.Router();

//middleware for input validation
function inputValidator(req : Request, res : Response, next : NextFunction){
    const { name, price, description } = req.body;

    // Input validations
    if (!name || !price || !description) {
        return res.status(400).json({
            message: "Missing fields!!"
        });
    }

    // Type checks
    if (typeof name !== 'string' || typeof price !== 'number' || typeof description !== 'string') {
        return res.status(400).json({
            message: "Failed to insert the document. Invalid types provided."
        });
    }
    next();
}

//createproduct route
router.post('/create',inputValidator, async (req : Request, res : Response)=>{
    try{
        const {name, price, description}  = req.body;
        //find if the product is already present in the database
        const findProduct = await products.findOne({name : {$eq : name}});

        if(findProduct){
            return res.status(403).json({
                message : "Product already exists! Please Update it if you intend to."
            })
        }
    
        const item : product = {
            name : name.trim(),
            price,
            description : description.trim()
        } 

        await products.create(item);

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

//get all products route
router.get('/', async (req : Request, res : Response) =>{
    try{
        const products_all = await products.find();
        if(products_all.length == 0){
            return res.status(404).json({
                message : "There are no products in the database"
            })
        }
        return res.status(200).json({
            products : products_all
        })
    }
    catch(err){
        console.log(err);        
    }
});

//get a specific product by id
router.get('/:id', async (req : Request, res: Response)=>{
    try{
        const product_key = `product:${req.params.id}`;
        const product_in_cache = await redisClient.get(product_key);

        if(product_in_cache){
            return res.status(200).json({
                message : "Product found in the cache",
                product : JSON.parse(product_in_cache)
            })
        }

        const product = await products.findById(req.params.id);
        await redisClient.set(product_key, JSON.stringify(product), {EX : 3600});

        if(!product){
            return res.status(404).json({
                message : "Product not found"
            })
        }

        return res.status(200).json(product)
    }
    catch(err:any){
        if (err instanceof mongoose.Error.CastError) {
            return res.status(400).json({ error: 'Invalid product ID format' });
        }
        res.status(400).json({
            error:err.message
        })
    }
});

//updateProduct
router.put('/update/:id', async (req : Request, res : Response)=>{
    try{
        const id = req.params.id;
        const {name, price, description} = req.body;

        const product_key =  `product:${id}`;

        const product = await products.findByIdAndUpdate(id, {name, price, description}, {new : true});
        
        if(!product){
            return res.json({
                message : "Product not found or Invalid ID provided"
            })
        }

        await redisClient.set(product_key, JSON.stringify(product));

        return res.status(200).json({
            message : "Product details updated",
            product : product
        })
    }
    catch(err){
        res.status(404).json({
            error : err
        })
    }
});

//deleteall
router.delete('/deleteAll', async (req : Request, res: Response)=>{
    try{
        //find if there are any products
        const count = await products.countDocuments();
        
        if(count == 0){
            return res.status(404).json({
                message : "No products found"
            })
        }
        const _ = await products.deleteMany({});
        redisClient.flushAll();

        return res.status(200).json({
            message : "Deleted products",
            products : _
        })
        

    }
    catch(err){

    }
})
//delete by id
router.delete('/delete/:id', async (req: Request, res: Response) => {
    try {
        const product_key =  `product:${req.params.id}`;
        const product = await products.findByIdAndDelete(req.params.id);
        
        if(product){
            await redisClient.del(product_key);
            return res.status(200).json({
                message : "product deleted successfully",
                productDeleted : product
            })
        }

        return res.status(404).json({
            message : "Unable to delete the product / Product not found"
        })
    } catch (err: any) {
        if (err instanceof mongoose.Error.CastError) {
            return res.status(400).json({ error: 'Invalid product ID format' });
        }
        res.status(404).json({
            error: err.message
        });
    }
});


export default router;
