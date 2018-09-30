angular.module('pieKiosk',[]).controller('pieCtrl', function($scope) {

var homeURL = "http://10.0.30.9/farm_reg";
    
$scope.getMyCtrlScope = function() {
     return $scope;   
};
    
////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////Pie Order Form/////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////

//Retrieve the initial list of all available pies
fetch(homeURL+'/api/pie_orders/list_pies/').then(function(repon) {
    repon.json().then(function(pies_list) {
        $scope.pies_list_original = pies_list;
        $scope.pies_list = pies_list;
        
        $scope.refreshOrderTable();
        $scope.$digest();
    });
}).catch(function(error) {alert(error);});


//Clear and rebuild order form
$scope.order_mode = "new";
$scope.refreshOrderTable = function(){
    
    $scope.pies_list = $scope.pies_list_original;
    $scope.all_pies = [$scope.pies_list.slice(0,33),$scope.pies_list.slice(34,65),$scope.pies_list.slice(65)];
    
    for(var i=0, ii=$scope.pies_list.length; i<ii; i++){
        $scope.pies_list[i].amt1 = null;
        $scope.pies_list[i].amt2 = null;
    }

    $scope.vis_page = "orderForm";
    $scope.show_cust_window = false;
    $scope.show_search_window = false;
    
    $scope.clearVals();
    
};

    

//Run whenever a pie quantity is changed in the order form
var newOrderPies = [];
var newOrderAmounts = [];
$scope.enterPieAmount = function(amt,id){

    var idx = newOrderPies.indexOf(id);
    if(idx==-1){
        newOrderPies.push(id);
        newOrderAmounts.push(amt);
    } else {
        if(amt>0){
            newOrderAmounts[idx] = amt;
        } else {
            newOrderPies.splice(idx,1);
            newOrderAmounts.splice(idx,1);
        }
    }
};
    
    
//Clear all stored values
$scope.clearVals = function(){
    $scope.newOrderLastName = "";
    $scope.newOrderFirstName = "";
    $scope.newOrderDatetime = null;
    $scope.newOrderPhone = null;
    $scope.newOrderNotes = "";
    
    newOrderPies = [];
    newOrderAmounts = [];  
};


//Submit a new order or update an existing one
$scope.submitOrder = function(){

    //Check for actual pie order
    if(newOrderAmounts.length<1){
        alert("Error: No pies ordered");
        return;
    }
    
    if($scope.newOrderLastName == "" || $scope.newOrderFirstName == ""){
        alert("Error: Customer name missing");
        return;
    } else if($scope.newOrderDatetime == null){
        alert("Error: Missing pickup date");
        return;
    } else if($scope.newOrderPhone.replace("-","").length!=10){
        alert("Error: Please enter a valid phone number");
        return;
    }

    //Construct the order object
    var order = 
            {
                last_name: $scope.newOrderLastName,
                first_name: $scope.newOrderFirstName,
                date_time: JSON.stringify($scope.newOrderDatetime).replace('"', '').slice(0, 19).replace('T', ' '),
                phone: $scope.newOrderPhone.replace("-",""),
                notes: $scope.newOrderNotes,
                status:0,
                pies:newOrderPies,
                amounts:newOrderAmounts
            };
    
    if($scope.order_mode=="edit"){
        //delete old version of order from database
        fetch(homeURL+'/api/pie_orders/delete_order/', {method:"POST", body:JSON.stringify({"payload":{order_id:$scope.edit_order_id}})});
    }

    //Send new order to database
    fetch(homeURL+'/api/pie_orders/new_order/', {method:"POST", body:JSON.stringify({"payload":order})})
        .then(function(response) {
            //console.log(response);
            response.json().then(function(d) {
                //console.log(d);
                //alert("Invalid product data");
            });
        }, function(error) {
            for(var propName in order[0]){
                alert(order[0][propName]);
            }
            alert("No internet connection probably");
    });

    //Clear customer info inputs
    $scope.refreshOrderTable();
};

    
////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////For Controlling Counter Bake/////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////
    
$scope.counter_date_raw = new Date();
$scope.counter_date_raw.setHours($scope.counter_date_raw.getHours()-4);
$scope.counter_date = $scope.counter_date_raw.toISOString().split("T")[0];
$scope.counter_disp_date = null;

$scope.refreshCounter = function(){
    
    //Clear table
    $scope.refreshOrderTable();
    
    //Retrieve counter bake info
    fetch(homeURL+'/api/pie_orders/get_counter_bake/', {method:"POST", body:JSON.stringify({"date":$scope.counter_date})}).then(function(repon) {
        repon.json().then(function(counter_bake) {       
            
            //Update quantities in the order form table
            for(var i=0, ii=counter_bake.length; i<ii; i++){
                var pie = counter_bake[i];
                var idx = pie.pie_id-1;

                if(idx<$scope.pies_list.length-1 && $scope.pies_list[idx].pie_name == $scope.pies_list[idx+1].pie_name){
                    $scope.pies_list[idx+1].amt1 = pie.counter;

                } else if($scope.pies_list[idx].pie_name == $scope.pies_list[idx-1].pie_name){
                    $scope.pies_list[idx].amt2 = pie.counter;

                } else {
                    $scope.pies_list[idx].amt1 = pie.counter;
                }

                //Update behind the scenes record
                $scope.enterPieAmount(pie.counter,pie.pie_id);
            }
            
            $scope.counter_disp_date = new Date($scope.counter_date).toLocaleDateString("en-US",{ weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
            
            $scope.$digest();
            
        });
        
    }).catch(function(error) {alert(error);});
};
    
//Arrow buttons
$scope.advanceCounterDate = function(dir){
    $scope.counter_date_raw.setDate($scope.counter_date_raw.getDate() + dir);
    $scope.counter_date = $scope.counter_date_raw.toISOString().split("T")[0];
    $scope.counter_disp_date = new Date($scope.counter_date).toLocaleDateString("en-US",{ weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
    
    $scope.refreshCounter();
};

//Save button
$scope.saveCounter = function(){
    
    var counter_bake = {
        date:$scope.counter_date,
        pies:newOrderPies,
        amounts:newOrderAmounts
    };
    
    fetch(homeURL+'/api/pie_orders/update_counter_bake/', {method:"POST", body:JSON.stringify(counter_bake)})
        .then(function(response) {
            //console.log(response);
            response.json().then(function(d) {
                //console.log(d);
                //alert("Invalid product data");
            });
        }, function(error) {
            for(var propName in order[0]){
                alert(order[0][propName]);
            }
            alert("No internet connection probably");
    });
};
    

////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////Searching Orders////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////

//Run whenever the search box is typed in
$scope.search_orders = function(){
    
    var query = {search_term:$scope.order_search_box};

    if(query.search_term.length<3){
        $scope.found_orders = [];
        return;
    }

    //Get all orders with the search query in the first name, last name, or phone number
    fetch(homeURL+'/api/pie_orders/search_orders/', {method:"POST", body:JSON.stringify({"payload":query})}).then(function(repon) {
        repon.json().then(function(orders) {
            
            //Add attributes for easier display
            for(var i=0,ii=orders.length;i<ii;i++){
                var order = orders[i];
                
                var date = order.date_time.split(" ")[0];
                date = date.split("-");
                date = date[1]+"/"+date[2]+"/"+date[0];
                orders[i].disp_date = date;
                
                orders[i].time = order.date_time.split(" ")[1];

                var pies = [];
                for(var j=0,jj=order.pies.length;j<jj;j++){
                    var pie = order.pies[j];
                    pies.push(' '+pie.quantity+'x '+pie.pie_size+'" '+pie.pie_name);
                }
                pies = pies.toString();
                if(pies.length>80){
                    pies = pies.slice(0,80)+"...";
                }
                
                orders[i].disp_order = pies;

            }
            
            $scope.found_orders = orders;
            $scope.$digest(); ///Wasn't necessary before. WTF happened?

        });
    }, function(error) {alert(error);});
};


//Run when an order in the order search window is clicked
$scope.select_order = function(order){
    
    //Keep track of order id for deleting old version later
    $scope.edit_order_id = order.id;
    
    //Clear table
    $scope.refreshOrderTable();

    //Update quantities in the order form table
    for(var i=0, ii=order.pies.length; i<ii; i++){
        var pie=order.pies[i];
        var idx = pie.pie_id-1;

        if(idx<$scope.pies_list.length-1 && $scope.pies_list[idx].pie_name == $scope.pies_list[idx+1].pie_name){
            $scope.pies_list[idx+1].amt1 = pie.quantity;
            
        } else if($scope.pies_list[idx].pie_name == $scope.pies_list[idx-1].pie_name){
            $scope.pies_list[idx].amt2 = pie.quantity;
            
        } else {
            $scope.pies_list[idx].amt1 = pie.quantity;
        }
        
        //Update behind the scenes record
        $scope.enterPieAmount(pie.quantity,pie.pie_id);
    }
    
    //Clear search window
    $scope.order_search_box = null;
    $scope.found_orders = null;
    
    //Update customer info window
    $scope.newOrderLastName = order.last_name;
    $scope.newOrderFirstName = order.first_name;
    $scope.newOrderDatetime = new Date(Date.parse(order.date_time.replace(" ","T")));
    $scope.newOrderDatetime.setTime($scope.newOrderDatetime.getTime()+14400000);
    $scope.newOrderPhone = order.phone;
    $scope.newOrderNotes = order.notes;
    
    $scope.show_search_window = false;
};

////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////Listing Ordered Pies//////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////
    
$scope.orders_date = new Date();
$scope.orders_date.setHours($scope.orders_date.getHours()-4);
$scope.orders_date = $scope.orders_date.toISOString().split("T")[0];
$scope.disp_date = null;
$scope.prev_date = null;
$scope.next_date = null;
$scope.daily_notes = null;
$scope.big_ordered_pies = null;
$scope.other_ordered_pies = null;

//Get all ordered pies and sort into big and small/other
//Also get the next and previous dates for the arrow buttons to use
$scope.get_ordered_pies = function(){
    
    fetch(homeURL+'/api/pie_orders/get_ordered_pies/', {method:"POST", body:JSON.stringify({"date_time":$scope.orders_date})}).then(function(repon) {
        repon.json().then(function(ordered_pies_etc) {
            
            $scope.disp_date = new Date($scope.orders_date).toLocaleDateString("en-US",{ weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
            
            var all_ordered_pies = ordered_pies_etc[0];
            
            $scope.prev_date = ordered_pies_etc[1];
            
            $scope.next_date = ordered_pies_etc[2];
            
            $scope.daily_notes = ordered_pies_etc[3];
            
            if(all_ordered_pies){
                $scope.big_ordered_pies = [];
                $scope.other_ordered_pies = [];
                
                for(var i=0,ii=all_ordered_pies.length; i<ii; i++){
                    var pie = all_ordered_pies[i];

                    if(pie.pie_size == 10 || pie.pie_size == 9){
                        $scope.big_ordered_pies.push(pie);
                    } else {
                        $scope.other_ordered_pies.push(pie);
                    }
                }
            }
            
            $scope.$digest();
            
        });
        
    }).catch(function(error) {alert(error);});
};


//Add pies to the baked list
$scope.bake_pies = function(pie_id, amount){
    fetch(homeURL+'/api/pie_orders/bake_pies/', {method:"POST", body:JSON.stringify({"date":$scope.orders_date,"pie_id":pie_id,"amount":amount})}).then(function(repon) {
        repon.json().then(function(ordered_pies_etc) {
                
        });
    }).catch(function(error) {alert(error);});
};
    
    
////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////Listing Daily Pie Orders//////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////
    
$scope.show_selected_order = false;
$scope.selected_order = null;
$scope.live_search_term = '';

$scope.get_pie_orders = function(){
    fetch(homeURL+'/api/pie_orders/get_pie_orders_by_date/', {method:"POST", body:JSON.stringify({"date":$scope.orders_date})}).then(function(repon) {
        repon.json().then(function(pie_orders_etc) {
            
            $scope.pie_orders = pie_orders_etc[0];
            
            //Make the order displayable
            if($scope.pie_orders){
                for(var i=0,ii=$scope.pie_orders.length; i<ii; i++){
                    
                    var order = $scope.pie_orders[i];
                    
                    //Make a pretty time for the stupid humans to read
                    $scope.pie_orders[i].time =order.date_time.split(" ")[1].replace(/:00+$/, "");
                    var time_break = order.time.split(":");
                    $scope.pie_orders[i].time = parseInt(time_break[0])>12 ? (parseInt(time_break[0])-12).toString()+":"+time_break[1]+" PM" : $scope.pie_orders[i].time+" AM"; 
                    
                    //Make a pretty phone number for the stupid humans to read
                    var phone_split = [order.phone.slice(0,3),order.phone.slice(3,6),order.phone.slice(6)];
                    $scope.pie_orders[i].phone = "("+phone_split[0]+") "+phone_split[1]+"-"+phone_split[2];
                    
                    var pies = [];
                    for(var j=0,jj=order.pies.length;j<jj;j++){
                        var pie = order.pies[j];
                        pies.push(' '+pie.quantity+'x '+pie.pie_size+'" '+pie.pie_name);
                    }
                    pies = pies.toString();
                    if(pies.length>80){
                        pies = pies.slice(0,100)+"...";
                    }

                    $scope.pie_orders[i].disp_order = pies;
                }
            }
            
            $scope.disp_date = new Date($scope.orders_date).toLocaleDateString("en-US",{ weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
            
            $scope.prev_date = pie_orders_etc[1];
            
            $scope.next_date = pie_orders_etc[2];
            
            $scope.$digest();
            
        });
    }).catch(function(error) {alert(error);});
};
    
    
    
//Print pie order slip
$scope.print_slip = function(selected_order){
    var doc = new jsPDF({
      orientation: selected_order.pies.length>8 ? 'portrait' : 'landscape',
      unit: 'mm',
      format: [30+7*selected_order.pies.length,80]
    });
    
    doc.setFontSize(12);
    
    doc.text(selected_order.last_name+', '+selected_order.first_name, 2, 7);
    
    for(var i=0, ii=selected_order.pies.length; i<ii; i++){
        doc.text(selected_order.pies[i].pie_size+'" ', 2, i*7+16);
        doc.text(selected_order.pies[i].pie_name, 10, i*7+16);
        doc.text(selected_order.pies[i].quantity, 75, i*7+16);
    }
    
    doc.text(selected_order.notes, 2, i*7+23);
    
    doc.save('pie_slip.pdf');
};
    

});