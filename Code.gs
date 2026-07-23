// Code.gs

var SPREADSHEET_ID = "YOUR_SPREADSHEET_ID_HERE"; // Replace with your Google Sheet ID

function getDb() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000); // 10 seconds wait to prevent Data Race
  try {
    var requestData = JSON.parse(e.postData.contents);
    var action = requestData.action;
    var payload = requestData.payload;
    var result = {};

    switch(action) {
      case 'getCards':
        result = getCards();
        break;
      case 'getUserData':
        result = getUserData(payload.userId, payload.displayName);
        break;
      case 'getUserInventory':
        result = getUserInventory(payload.userId);
        break;
      case 'gachaSpin':
        result = gachaSpin(payload.userId);
        break;
      case 'checkInGPS':
        result = checkInGPS(payload.userId, payload.cardId, payload.lat, payload.lng);
        break;
      case 'submitQuiz':
        result = submitQuiz(payload.userId, payload.isCorrect);
        break;
      case 'getMarketplace':
        result = getMarketplace();
        break;
      case 'buyMarketplace':
        result = buyMarketplace(payload.userId, payload.listingId);
        break;
      case 'sellMarketplace':
        result = sellMarketplace(payload.userId, payload.inventoryId, payload.price);
        break;
      default:
        result = { error: 'Invalid action' };
    }

    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ error: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  // Simple check for GAS deployment
  return ContentService.createTextOutput("Sasam API is running.");
}

// Utility to map rows to objects
function getSheetData(sheetName) {
  var sheet = getDb().getSheetByName(sheetName);
  var data = sheet.getDataRange().getValues();
  if (data.length === 0) return [];
  var headers = data.shift();
  return data.map(function(row) {
    var obj = {};
    headers.forEach(function(header, i) {
      obj[header] = row[i];
    });
    return obj;
  });
}

function appendRow(sheetName, rowData) {
  var sheet = getDb().getSheetByName(sheetName);
  sheet.appendRow(rowData);
}

function getCards() {
  return { status: 'success', cards: getSheetData('Cards') };
}

function getUserData(userId, displayName) {
  var sheet = getDb().getSheetByName('Users');
  var data = sheet.getDataRange().getValues();
  var headers = data.length > 0 ? data[0] : [];
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == userId) {
      return { status: 'success', user: { user_id: data[i][0], display_name: data[i][1], coins: data[i][2], created_at: data[i][3] }};
    }
  }
  // User not found, create one
  var newUser = [userId, displayName || 'Guest', 500, new Date().toISOString()];
  appendRow('Users', newUser);
  return { status: 'success', user: { user_id: newUser[0], display_name: newUser[1], coins: newUser[2], created_at: newUser[3] }};
}

function getUserInventory(userId) {
  var inventory = getSheetData('Inventory').filter(function(item) {
    return item.user_id == userId;
  });
  return { status: 'success', inventory: inventory };
}

function gachaSpin(userId) {
  var usersSheet = getDb().getSheetByName('Users');
  var usersData = usersSheet.getDataRange().getValues();
  var userRowIndex = -1;
  var coins = 0;
  for (var i = 1; i < usersData.length; i++) {
    if (usersData[i][0] == userId) {
      userRowIndex = i + 1;
      coins = usersData[i][2];
      break;
    }
  }

  if (userRowIndex === -1) return { error: 'User not found' };
  var cost = 50; 
  if (coins < cost) return { error: 'Not enough coins' };
  
  usersSheet.getRange(userRowIndex, 3).setValue(coins - cost);
  
  var rand = Math.random();
  var targetRarity = 'Common';
  if (rand < 0.05) targetRarity = 'Secret';
  else if (rand < 0.30) targetRarity = 'Rare'; 
  
  var cards = getSheetData('Cards').filter(function(c) { return c.rarity == targetRarity; });
  if (cards.length === 0) cards = getSheetData('Cards'); 
  
  var selectedCard = cards[Math.floor(Math.random() * cards.length)];
  var invId = 'INV-' + new Date().getTime() + '-' + Math.floor(Math.random() * 1000);
  
  appendRow('Inventory', [invId, userId, selectedCard.card_id, 'Gacha', new Date().toISOString()]);
  
  return { status: 'success', obtained: selectedCard, coins: coins - cost };
}

function checkInGPS(userId, cardId, lat, lng) {
  var invId = 'INV-' + new Date().getTime() + '-' + Math.floor(Math.random() * 1000);
  appendRow('Inventory', [invId, userId, cardId, 'GPS', new Date().toISOString()]);
  return { status: 'success', message: 'Checked in successfully!' };
}

function submitQuiz(userId, isCorrect) {
  if (isCorrect) {
    var usersSheet = getDb().getSheetByName('Users');
    var usersData = usersSheet.getDataRange().getValues();
    for (var i = 1; i < usersData.length; i++) {
      if (usersData[i][0] == userId) {
        var currentCoins = usersData[i][2];
        usersSheet.getRange(i + 1, 3).setValue(currentCoins + 20);
        return { status: 'success', coins: currentCoins + 20, message: 'Correct! +20 Coins' };
      }
    }
  }
  return { status: 'success', message: 'Incorrect!' };
}

function getMarketplace() {
  var market = getSheetData('Marketplace').filter(function(item) {
    return item.status == 'Active';
  });
  return { status: 'success', marketplace: market };
}

function sellMarketplace(userId, inventoryId, price) {
  var listId = 'MKT-' + new Date().getTime();
  var invItem = getSheetData('Inventory').find(function(i) { return i.id == inventoryId && i.user_id == userId });
  if(!invItem) return {error: "Inventory item not found."};

  appendRow('Marketplace', [listId, userId, inventoryId, invItem.card_id, price, 'Active']);
  
  var invSheet = getDb().getSheetByName('Inventory');
  var invData = invSheet.getDataRange().getValues();
  for (var i = 1; i < invData.length; i++) {
    if(invData[i][0] == inventoryId) {
       invSheet.getRange(i+1, 2).setValue('ON_MARKET');
       break;
    }
  }

  return { status: 'success', message: 'Listed successfully' };
}

function buyMarketplace(buyerId, listingId) {
  var mktSheet = getDb().getSheetByName('Marketplace');
  var mktData = mktSheet.getDataRange().getValues();
  var listingRow = -1;
  var listing = null;
  
  for (var i = 1; i < mktData.length; i++) {
    if (mktData[i][0] == listingId && mktData[i][5] == 'Active') {
      listingRow = i + 1;
      listing = { seller_id: mktData[i][1], inventory_id: mktData[i][2], card_id: mktData[i][3], price: mktData[i][4] };
      break;
    }
  }
  
  if (!listing) return { error: 'Listing not found or already sold' };
  
  var usersSheet = getDb().getSheetByName('Users');
  var usersData = usersSheet.getDataRange().getValues();
  
  var buyerRow = -1; var buyerCoins = 0;
  var sellerRow = -1; var sellerCoins = 0;
  
  for (var i = 1; i < usersData.length; i++) {
    if (usersData[i][0] == buyerId) { buyerRow = i + 1; buyerCoins = usersData[i][2]; }
    if (usersData[i][0] == listing.seller_id) { sellerRow = i + 1; sellerCoins = usersData[i][2]; }
  }
  
  if (buyerCoins < listing.price) return { error: 'Not enough coins' };
  if (buyerId == listing.seller_id) return { error: 'Cannot buy your own listing' };

  usersSheet.getRange(buyerRow, 3).setValue(buyerCoins - listing.price);
  if(sellerRow > -1) usersSheet.getRange(sellerRow, 3).setValue(sellerCoins + listing.price);
  
  mktSheet.getRange(listingRow, 6).setValue('Sold');
  
  var invId = 'INV-' + new Date().getTime() + '-' + Math.floor(Math.random() * 1000);
  appendRow('Inventory', [invId, buyerId, listing.card_id, 'Trade', new Date().toISOString()]);
  
  return { status: 'success', message: 'Bought successfully!' };
}
