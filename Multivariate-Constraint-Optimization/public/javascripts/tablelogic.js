$(document).ready(function(){
 $("#add_row").click(function(){
     $('#tab_logic').append("<tr><td><input type='text' class='name-input form-control input-md' /></td>"+
     "<td><input  type='text' class='desc-input form-control input-md'></td>"+
     "<td><input type='text' class='cost-input form-control input-md'></td>"+
     "<td><input type='text' class='heuristic-input form-control input-md'</td>"+
     "<td><input type='text' class='optimization-input form-control input-md'></td>"+
     "<td><button type='text' class='delete form-control input-md'>Delete</button></td></tr>");
     console.log("append");
});
 $("body").on("click", ".delete", function () {
   $(this).closest('tr').remove();
 });

});
