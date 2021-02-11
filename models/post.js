const mongoose= require("mongoose");
const Schema=mongoose.Schema;

const userDataSchema=new Schema({
    _id:{
        type:String,
        required:true
    },

    post:{
        title:{
        
        },
    },

    batch:{
        name:{
        
        },

        time:{
        
        },

        students:[],

        location:{
            type:String
        },

        maxStudent:{
            type:String
        },

        subjects:{
            type:String
        },

        fee:{
            type:String
        },

    },

    calender:{
        sat:[],
        sun:[],
        mon:[],
        tue:[],
        wed:[],
        thu:[],
        fri:[]
    }
});



module.exports=mongoose.model('User',userDataSchema,'users');