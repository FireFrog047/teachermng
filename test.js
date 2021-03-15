const dummy={
    "name":"test",
    'userName':'firefrog',
    'role':'admin',
    'mobileNumber':'12345'
}

function methodName (arguments) {
    const valueToUpdate=['name','userName','role','mobileNumber','division','city'];
    let valueForDb={};
    valueToUpdate.forEach(value =>{
        if (arguments[value]){
            valueForDb[value]=arguments[value];
        }
    });
    return valueForDb;
}

console.log(methodName(dummy));