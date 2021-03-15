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
    },
    role:{
        type:String,
    },
    mobileNumber:{
        type:String,
    },
    password:{
        type:String,
        required:true
    },
    division:{
        type:String,
    },
    city:{
        type:String,
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