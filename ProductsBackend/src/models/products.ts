import mongoose, {Document} from "mongoose";

interface product extends Document{
    name : string,
    price : number,
    description : string
}

const productSchema = new mongoose.Schema <product>({
    name : 'string',
    price : 'number',
    description : 'string'
});

export default mongoose.model<product>('Product', productSchema);