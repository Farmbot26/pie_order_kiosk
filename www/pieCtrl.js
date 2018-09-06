angular.module('pieKiosk',[]).controller('pieCtrl', function($scope) {

var homeURL = "http://192.168.1.194/farm_reg";
    
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
    $scope.all_pies = [$scope.pies_list.slice(0,33),$scope.pies_list.slice(34,65),$scope.pies_list.slice(66)];
    
    for(var i=0, ii=$scope.pies_list.length; i<ii; i++){
        $scope.pies_list[i].amt1 = null;
        $scope.pies_list[i].amt2 = null;
    }

    $scope.vis_page = "orderForm";
    $scope.show_cust_window = false;
    $scope.show_search_window = false;
    
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


//Submit a new order or update an existing one
$scope.submitOrder = function(){

    //Check for actual pie order
    if(newOrderAmounts.length<1){
        alert("Error: No pies ordered");
        return;
    }

    //Construct the order object
    var order = 
            {
                last_name: $scope.newOrderLastName,
                first_name: $scope.newOrderFirstName,
                date_time: JSON.stringify($scope.newOrderDatetime).replace('"', '').slice(0, 19).replace('T', ' '),
                phone: $scope.newOrderPhone,
                notes: $scope.newOrderNotes,
                status:0,
                pies:newOrderPies,
                amounts:newOrderAmounts
            };
    
    if($scope.order_mode=="edit"){
        //delete old version of order from database
        fetch(homeURL+'/api/pie_orders/delete_order/', {method:"POST", body:JSON.stringify({"payload":{order_id:$scope.edit_order_id}})});
    }

    //Send to database
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
    $scope.newOrderLastName = "";
    $scope.newOrderFirstName = "";
    $scope.newOrderDatetime = null;
    $scope.newOrderPhone = null;
    $scope.newOrderNotes = "";
    
    newOrderPies = [];
    newOrderAmounts = [];

    $scope.refreshOrderTable();
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
                    pies.push(' '+pie.quantity+'x'+pie.pie_size+'" '+pie.pie_name);
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


});