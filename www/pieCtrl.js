////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////General Functions/////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////
angular.module('pieKiosk', []).controller('pieCtrl', function($scope) {

var homeURL = "http://192.168.1.194/farm_reg";
    
//Function to switch between the 4 pages
$scope.switchPage = function(pageName) {

    switch(pageName){
        case "newOrder":
            $scope.vis_page = "newOrder";
            generateTable("newOrder",null);
            break;
        case "editOrder":
            document.getElementById("orderSearchWindow").style.display="block";
            break;
    }
};

    
var newOrderPies = [];
var newOrderAmounts = [];
function enterPieAmount(inputElem,type){
    if(isNaN(inputElem.id)){return;}

    if(inputElem.value<=0){
        inputElem.value="";
    }

    if(type=="new"){
        var piesList = newOrderPies;
        var amtList = newOrderAmounts;
    } else {
        var piesList = editOrderPies;
        var amtList = editOrderAmounts;
    }

    var idx = piesList.indexOf(inputElem.id);
    var amt = inputElem.value;
    if(idx==-1){
        piesList.push(inputElem.id);
        amtList.push(amt);
    } else {
        if(amt>0){
            amtList[idx] = amt;
        } else {
            piesList.splice(idx,1);
            amtList.splice(idx,1);
        }
    }
}            


//Function to generate the order form table (New Order and Edit Order pages)
function generateTable(mode, order){

    //Get all the available kinds of pie from database
    fetch(homeURL+'/api/pie_orders/list_pies/').then(function(repon) {
        repon.json().then(function(all_pies) {
            
            console.log(all_pies);
            $scope.all_pies = all_pies;
            
            function makeColumn(idx){
                var col = document.createElement("table");
                col.id = "newOrderTable"+idx;
                col.setAttribute('cellspacing','0');
                col.className = "orderTable";
                document.getElementById(mode).appendChild(col);
                return col;
            }

            var currentCol = makeColumn("1");

            //Function to add headers to the sections
            var alreadyHasHeader = false;

            function addHeader(text){
                var row = document.createElement("tr");
                row.innerHTML="<td class='pieHeader'>8 Inch</td><td class='pieHeader'>10 Inch</td><td class='pieHeader' style='width:20vw'>"+text+"</td>";
                currentCol.appendChild(row);
            }

            addHeader("FRUIT PIES");

            //Loop through all the pies    
            for(var i=1,ii=all_pies.length;i<ii;i++){

                //Check if we need a header and add one if so
                if(alreadyHasHeader){
                    alreadyHasHeader = false;
                } else if(all_pies[i].pie_name.includes("Donut")){
                    var row = document.createElement("tr");
                    row.innerHTML="<td class='pieHeader' colspan=3>OTHER</td>";
                    currentCol.appendChild(row);
                    alreadyHasHeader = true;
                }
                else{
                    alreadyHasHeader = true;
                    switch(all_pies[i].pie_name){
                        case "Peach Crumb":
                            currentCol = makeColumn("2");
                            addHeader("FRUIT PIES");
                            break;
                        case "No Sugar Apple":
                            addHeader("NO SUGAR ADDED");
                            break;
                        case "Banana Cream":
                            currentCol = makeColumn("3");
                            currentCol.style.width="34vw";
                            addHeader("CREAM PIES");
                            break;
                        case "Asparagus Cheese":
                            addHeader("VEGETABLE PIES");
                            break;
                        case "Tomato Cheese":
                            alreadyHasHeader = false;
                            break;
                    }
                }

                //Parse through the pie data and enter in a row accordingly
                var pie = all_pies[i];
                var pie_id = parseInt(pie.pie_id);
                var pie_name = pie.pie_name;
                var pie_size = pie.pie_size;

                var row = document.createElement("tr");

                if(i+1<ii && all_pies[i+1].pie_name==pie_name){
                    continue;
                }else if(all_pies[i-1].pie_name==pie_name){
                    row.innerHTML="<td><input id='"+(pie_id-1).toString()+"' type='number'></td><td><input id='"+pie_id+"' type='number' style='width:100%'></td><td class='pieName'>"+pie_name+"</td>";
                } else if(pie_size=="8"){
                    row.innerHTML="<td colspan=2 style='background-color:black'><input id='"+pie_id+"' type='number' class='pieInput8'></td><td class='pieName'>"+pie_name+"</td>";
                } else if(pie_size=="10"){
                    row.innerHTML="<td colspan=2 style='background-color:black'><input id='"+pie_id+"' type='number' class='pieInput10'></td><td class='pieName'>"+pie_name+"</td>";
                } else {
                    row.innerHTML="<td colspan=2 style='background-color:black'><input id='"+pie_id+"' type='number' class='pieInput9'></td><td class='pieName'>"+pie_name+"</td>";
                }
                currentCol.appendChild(row);
            }

            $("input").change(function(e){
                enterPieAmount(e.target,"new");
            });

            //Add button to make customer info come up
            var row = document.createElement("tr");
            row.innerHTML="<td class='pieHeader' colspan=3><button class='doneButton' onclick=document.getElementById('newOrderWindow').style.display='block'>CUSTOMER INFO</button></td>";
            currentCol.appendChild(row);

        });
    }).catch(function(error) {alert(error);});

}

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
    document.getElementById("newOrder").innerHTML="";
    generateTable();

    //Close info window
    document.getElementById("newOrderWindow").style.display="none";
};


////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////Searching Orders////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////

function search_orders(){

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
                        generateTable("editOrder",order);
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