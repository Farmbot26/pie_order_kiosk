////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////General Functions/////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////
angular.module('pieKiosk',[]).controller('pieCtrl', function($scope) {

var homeURL = "http://192.168.1.194/farm_reg";

function refreshOrderTable(){
    fetch(homeURL+'/api/pie_orders/list_pies/').then(function(repon) {
        repon.json().then(function(all_pies) {
            $scope.all_pies = [all_pies.slice(0,33),all_pies.slice(34,65),all_pies.slice(66)];
            $scope.vis_page = "newOrder";
            $scope.show_new = false;
        });
    }).catch(function(error) {alert(error);});
}
refreshOrderTable();
    
    
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

    
////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////Placing New Orders////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////
    
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
    $scope.date_time = null;
    $scope.newOrderPhone = null;
    $scope.newOrderNotes = "";

    //Clear order table
    refreshOrderTable();
};


////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////Searching Orders////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////

$scope.search_orders = function(){

    var query = {search_term:document.getElementById("orderSearchBox").value};

    if(query.search_term.length<3){
        var resultsTable = document.getElementById("resultsTable");
        resultsTable.innerHTML = "<tr><td class='pieHeader'>Customer Name</td><td class='pieHeader'>Date</td><td class='pieHeader'>Time</td><td class='pieHeader'>Order</td></tr>";
        return;
    }

    //Get all orders with the search query in the first or last name
    fetch(homeURL+'/api/pie_orders/search_orders/', {method:"POST", body:JSON.stringify({"payload":query})}).then(function(repon) {
        repon.json().then(function(orders) {

            //Initialize the results table
             var resultsTable = document.getElementById("resultsTable");
            resultsTable.innerHTML = "<tr><td class='pieHeader'>Customer Name</td><td class='pieHeader'>Date</td><td class='pieHeader'>Time</td><td class='pieHeader'>Order</td></tr>";

            for(var i=0,ii=orders.length;i<ii;i++){
                var order = orders[i];
                var last_name = order.last_name;
                var first_name = order.first_name;
                var date = order.date_time.split(" ")[0];
                date = date.split("-");
                date = date[1]+"/"+date[2]+"/"+date[0];
                var time = order.date_time.split(" ")[1];
                var phone = order.phone;
                var notes = order.notes;

                var pies = [];
                for(var j=0,jj=order.pies.length;j<jj;j++){
                    var pie = order.pies[j];
                    pies.push(' '+pie.pie_size+'" '+pie.pie_name);
                }
                pies = pies.toString();
                if(pies.length>80){
                    pies = pies.slice(0,80)+"...";
                }

                var row = document.createElement("tr");
                row.innerHTML = "<td>"+last_name+", "+first_name+"</td><td>"+date+"</td><td>"+time+"</td><td>"+pies+"</td>";

                try{
                   throw last_name; 
                } catch(x) {
                    row.onclick = function(){
                        console.log(x);
                        //generateTable("editOrder",order);
                        document.getElementById("orderSearchWindow").style.display="none";
                    };
                }


                resultsTable.appendChild(row);
            }

        });
    }, function(error) {alert(error);});
}

////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////Editing Orders////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////


});