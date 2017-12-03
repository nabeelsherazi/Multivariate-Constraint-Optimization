$(function () {
  var inputs = $("#inputs");
  var budgetInput = $("#budget");

  var heuristicInput = $("#threshold");
  var optimizationRow = $('.optimization-row').first();
  $("#add-button").click(function () {
    var newRow = optimizationRow.clone(false);
    newRow.find('input').val('').end().appendTo(inputs);
  });
  inputs.on("click", ".delete-button", function () {
    $(this).closest('tr').remove();
  });
  $('#optimize-button').click(function () {
    $("tr").each(function() {
      $(this).css('background', "");
    });
    var itemsLength = $('.group-input').length;
    var items = [];
    var error = false;
    for (var i = 0; i < itemsLength; i++) {
      items.push({});
    };

    $('.group-input').each(function (i) {
      var input = $(this).val();
      items[i].group = input;
    });
    $('.desc-input').each(function (i) {
      var input = $(this).val();
      items[i].desc = input;
    });
    $('.cost-input').each(function (i) {
      var input = parseInt($(this).val());
      if (isNaN(input)) {
        error = true;
        return alert("Cost for row " + (i + 1) + " is not an integer");
      }
      items[i].cost = input;
    });
    $('.heuristic-input').each(function (i) {
      var input = parseInt($(this).val());
      if (isNaN(input)) {
        error = true;
        return alert("CO2 for row " + (i + 1) + " is not an integer");
      }
      items[i].heuristic = input;
    });
    $('.optimization-input').each(function (i) {
      var input = parseInt($(this).val());
      items[i].benefit = input;
      if (isNaN(input)) {
        error = true;
        return alert("Benefit for row " + (i + 1) + " is not an integer");
      }
    });

    if (error) {
      return false;
    }

    var memorizedDictionary = {};
    var recurse = function (itemIndex, budget, heuristic) {
      if (itemIndex == 0) {
        //can we meet the remaining heuristic through a combination of PPA and item 0, given the budget

        if (budget >= items[0].cost && heuristic <= items[0].heuristic) { //meet it entirely through item 0
          return [items[0].benefit, [{}, 0]];
        }
        //check to see if we can meet it through item 0 and the rest through ppa
        var penaltyCostVal = parseInt($("#penalty-cost").val());
        var ppaAmount = heuristic - items[0].heuristic;
        var ppaCostPartial = ppaAmount * penaltyCostVal;
        if (budget >= items[0].cost + ppaCostPartial) {
          ppaItem = { //create a fake item to describe the PPA purchase
            group: 'CORP',
            desc: 'PPA',
            cost: ppaCostPartial,
            heuristic: ppaAmount,
            benefit: 0
          };
          return [0, [ppaItem, 0]];
        }

        var remainingPPAAmount = penaltyCostVal * heuristic; //amount of PPA you need to buy, in $
        if (budget >= remainingPPAAmount) {
          ppaItem = { //create a fake item to describe the PPA purchase
            group: 'CORP',
            desc: 'PPA',
            cost: remainingPPAAmount,
            heuristic: heuristic,
            benefit: 0
          };
          return [0, [ppaItem]];
        }
        return [-Infinity, [{}]];
      }
      var dictEntry = [itemIndex, budget, heuristic];
      var previousItem;
      var prevIndex = itemIndex - 1;
      var prevInputs = [prevIndex, budget, heuristic];
      if (memorizedDictionary.hasOwnProperty(prevInputs)) { //it's memorized, use it
        previousItem = memorizedDictionary[prevInputs];
      }
      else {
        previousItem = recurse(prevIndex, budget, heuristic);
      }
      var item = items[itemIndex];
      var itemCost = item.cost;
      var newItem;
      if (budget < itemCost) {
        memorizedDictionary[dictEntry] = previousItem;
        return previousItem;
      }

      var itemHeuristic = item.heuristic;
      var itemBenefit = item.benefit;
      var prevInputsWithNew = [prevIndex, budget - itemCost, Math.max(heuristic - itemHeuristic, 0)];
      var prevItemWithNew;
      if (memorizedDictionary.hasOwnProperty(prevInputsWithNew)) { //it's memorized, use it
        prevItemWithNew = memorizedDictionary[prevInputs];
      }
      else {
        prevItemWithNew = recurse(prevIndex, budget - itemCost, Math.max(heuristic - itemHeuristic, 0));
      }
      var newBenefit = prevItemWithNew[0] + itemBenefit;
      var newItems = prevItemWithNew[1].slice();
      newItems.push(itemIndex);

      var previousBenefit = previousItem[0];
      if (previousBenefit >= newBenefit) {
        memorizedDictionary[dictEntry] = previousItem;
        return previousItem;
      }
      //adding the new item is better
      var newEntry = [newBenefit, newItems];
      memorizedDictionary[dictEntry] = newEntry;
      return newEntry;
    }

    var results = recurse(itemsLength - 1, parseInt(budgetInput.val()), parseInt(heuristicInput.val()));
    var maxBenefit = results[0];
    var itemIndices = results[1];
    var totalCost = 0;
    var totalBenefit = 0;
    var totalHeuristic = 0;
    var rows = $("tr");
    for (var i = 1; i < itemIndices.length; i++) {
      var j = itemIndices[i];
      rows.eq(j + 1).css('background', "#00ff00");
      totalCost += items[j].cost;
      totalBenefit += items[j].benefit;
      totalHeuristic += items[j].heuristic;
    }
    var ppaItem = itemIndices[0];
    var ppaCost = 0;
    if (ppaItem.cost) {
      ppaCost = ppaItem.cost;
    }
    var ppaCo2 = 0;
    if (ppaItem.totalHeuristic) {
      ppaCo2 = ppaItem.heuristic;
    }
    
    $("#total-cost-value").text(totalCost + ppaCost);
    $("#total-benefit-value").text(totalBenefit);
    $("#improvement-cost-value").text(totalCost);
    $("#pen-cost2").text(ppaCost);
    $("#budget-value").text(budgetInput.val());
    $("#total-heuristic").text(totalHeuristic + ppaItem.heuristic);
    $("#goal-co2-reduction-value").text(heuristicInput.val());
    $("#improvement-co2-reduction-value").text(totalHeuristic);
    $("#ppa-co2-reduction-value").text(ppaItem.heuristic);

    var averageCost = (totalCost + ppaCost) / (totalHeuristic + ppaItem.heuristic);
    $("#average-cost-value").text(Math.round(averageCost*100,2)/100);

    //create the table for business units i.e. projects funded, 
    var byBusUnit = {};
    for (var i = 1; i < itemIndices.length; i++) {
      var j = itemIndices[i];
      var project = items[j];
      if (!byBusUnit.hasOwnProperty(project.group)) {
        byBusUnit[project.group] = {
          projects: [],
          name: project.group,
          totalCost: 0,
          totalBenefit: 0
        }
      }
      byBusUnit[project.group].projects.push(project.desc);
      byBusUnit[project.group].totalCost += project.cost;
      byBusUnit[project.group].totalBenefit += project.benefit;
    }
    $("#bybub").empty();
    Object.keys(byBusUnit).forEach(function (key, i) {
      var busunit = byBusUnit[key];
      var bullets = "";
      busunit.projects.forEach(function (project) {
        bullets += '<li>' + project + '</li>\n';
      });
      $('#bybub').append('<tr>' +
        '<td>' + busunit.name + '</td>\n' +
        '<td><input type="number" index="' + i + '" id="busunit' + i + '" class="busunitco2" value="0" />' +
        '<td><ul>' + bullets + '</ul></td>' +
        '<td class="totalbenefitline">' + busunit.totalBenefit + '</td>' +
        '<td id="totalcostline' + i + '">' + busunit.totalCost + '</td>' +
        '<td><span id="co2pp' + i + '">0</span></td>' +
        '<td><span id="co2np' + i + '">' + busunit.totalCost + '</span></td></tr>');
    });
  });
  $("body").on("blur", ".busunitco2", function () {
    var levels = parseInt($(this).val());
    var payment = Math.round(levels * parseFloat($("#percent").val())/100 * parseFloat($("#average-cost-value").text()) * 100) / 100;
    var tr = $(this).closest('tr');
    var i = $(this).attr('index');
    $('#co2pp' + i).text(payment);
    var totalCostLine = parseFloat($('#totalcostline' + i).text());
    var diff = Math.round((payment - totalCostLine) * 100) / 100;
    $('#co2np' + i).text(diff);
  });
});