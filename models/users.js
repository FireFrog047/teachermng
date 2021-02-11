const mongoose= require("mongoose");
const Schema=mongoose.Schema;

const userSchema=new Schema({
    email:{
        type:String,
        required:true
    },
    name:{
        type:String,
        required:true
    },
    userName:{
        type:String,
        required:true
    },
    role:{
        type:String,
        required:true
    },
    mobileNumber:{
        type:String,
        required:true
    },
    password:{
        type:String,
        required:true
    },
    division:{
        type:String,
        required:true
    },
    city:{
        type:String,
        required:true
    },
    refreshToken:{
        type:String},
    accessToken:{
        type:String
    },
    resetPwToken:{type:String},
    resetPwTokenExpDate:{type:String},
    confirmMailToken:{type:String}
    },
    {timestamps:true}
);



module.exports=mongoose.model('User',userSchema,'users');