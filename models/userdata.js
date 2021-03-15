const mongoose= require("mongoose");
const Schema=mongoose.Schema;
const userDataSchema=new Schema({
    _id:{
        type:String,
        required:true
    },
    parentId:{
        type:String,
        required:true
    },
    postsId:[],
    batch:[{
        title:{},
        studentlist:[{
            studentname:{},
            studentid:{},
        }],
        maxstudent:{}
    }]
});
module.exports=mongoose.model('User_data',userDataSchema,'users_data');