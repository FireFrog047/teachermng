const mongoose= require("mongoose");
const Schema=mongoose.Schema;
const userPostSchema=new Schema({
    authorId:{
        type:String,
        required:true
    },
    authorEmail:{
        type:String,
        required:true
    },
    post:[{
        title:{type:String},
        content:{type:String}
    }]
});
module.exports=mongoose.model('User_post',userPostSchema,'users_posts');