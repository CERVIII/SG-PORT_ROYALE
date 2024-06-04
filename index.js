const express = require('express');
const path = require('path');
const app = express();

app.use(express.static(path.join(__dirname, '.')));
app.use(express.json());

function readDB() {
  const fs = require('fs');
  const data = fs.readFileSync('db.json');
  return JSON.parse(data);
}

function writeDB(data) {
  const fs = require('fs');
  fs.writeFileSync('db.json', JSON.stringify(data));
}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});



// MONEY
app.get('/money/:group',
  (req, res) => {
    const { params } = req;
    const { group } = params;
    const db = readDB();
    console.log(`[GET] /money/${group}`);

    if (!db[group]) {
      console.error('El grupo no existe');
      return res.status(400).json({
        success: false,
        error: 'El grupo no existe',
        result: null
      });
    }
    return res.status(200).json({
      success: true,
      error: null,
      result: db[group].money
    })
  }
);
app.post('/money',
  (req, res) => {
    const { body } = req;
    const { group, amount } = body;
    const db = readDB();
    console.log(`[POST] /money group: ${group} amount: ${amount}`);

    if (!db[group]) {
      console.error('El grupo no existe');
      return res.status(400).json({
        success: false,
        error: 'El grupo no existe',
        result: null
      });
    }
    db[group].money += amount;
    writeDB(db);
    return res.status(200).json({
      success: true,
      error: null,
      result: db[group].money
    })
  }
);

//LEVEL
const next_level = {
  1: 0,
  2: 5000,
  3: 7500,
  4: 10000,
  5: 15000,
  6: 'MAX LEVEL'
};


app.get('/level/:group',
  (req, res) => {
    const { params } = req;
    const { group } = params;
    const db = readDB();
    console.log(`[GET] /level/${group}`);

    if (!db[group]) {
      console.error('El grupo no existe');
      return res.status(400).json({
        success: false,
        error: 'El grupo no existe',
        result: null
      });
    }
    return res.status(200).json({
      success: true,
      error: null,
      result: db[group].level
    })
  }
);
app.post('/level',
  (req, res) => {
    const { body } = req;
    const { group } = body;
    const db = readDB();
    console.log(`[POST] /level group: ${group} `);

    if (!db[group]) {
      console.error('El grupo no existe');
      return res.status(400).json({
        success: false,
        error: 'El grupo no existe',
        result: null
      });
    }

    const level = db[group].level;
    const cost = next_level[level + 1];
    if (level < 5) {
      if (db[group].money >= cost) {
        db[group].money -= cost;
        db[group].level += 1;
        writeDB(db);
        return res.status(200).json({
          success: true,
          error: null,
          result: db[group].level
        })
      } else {
        console.error('No tienes dinero suficiente');
        return res.status(400).json({
          success: false,
          error: 'No tienes dinero suficiente',
          result: null
        });
      }
    } else {
      console.error('Ya tienes el nivel máximo');
      return res.status(400).json({
        success: false,
        error: 'Ya tienes el nivel máximo',
        result: null
      });
    }
  }
);

// PRODUCTS
const maxProductosPorNivel = {
  1: 50,
  2: 75,
  3: 150,
  4: 150,
  5: 300
};
const maxCañones = {
  1: 10,
  2: 15,
  3: 20,
  4: 25,
  5: 25
};
const maxMunicion = {
  1: 20,
  2: 25,
  3: 30,
  4: 35,
  5: 35
};


app.get('/products/:group',
  (req, res) => {
    const { params } = req;
    const { group } = params;
    const db = readDB();
    console.log(`[GET] /products/${group}`);

    if (!db[group]) {
      console.error('El grupo no existe');
      return res.status(400).json({
        success: false,
        error: 'El grupo no existe',
        result: null
      });
    }
    return res.status(200).json({
      success: true,
      error: null,
      result: {
        boat: db[group].boat,
        storage: db[group].storage,
      }
    })
  });

// BUY BOAT
/**
 * boat:{
 *  "azucar": 1
 * },
 * storage: {
 *  "azucar": 0
 * }
**/

function getBoatCapacity(boat) {
  let capacity = 0;
  for (let product in boat) {
    if (product !== 'Cañones' && product !== 'Municion') {
      capacity += boat[product];
    }
  }
  return capacity;
}


app.post('/products/buy',
  (req, res) => {
    const { body } = req;
    const {
      group,
      product,
      amount,
      unitary_price,
    } = body;

    console.log(`[POST] /products/buy group: ${group} product: ${product} amount: ${amount} unitary_price: ${unitary_price} `);
    const db = readDB();
    if (!db[group]) {
      console.error('El grupo no existe');
      return res.status(400).json({
        success: false,
        error: 'El grupo no existe',
        result: null
      });
    }
    if (!db[group].boat[product] && db[group].boat[product] !== 0) {
      console.error('El producto no existe');
      console.log(db[group].boat[product]);
      return res.status(400).json({
        success: false,
        error: 'El producto no existe',
        result: null
      });
    }
    const boatCapacity = getBoatCapacity(db[group].boat);
    const maxAffordable = Math.floor(db[group].money / unitary_price);
    const maxCapacity = maxProductosPorNivel[db[group].level];
    let maxProductsToBuy = 0;
    if (product === 'Cañones') {
      maxProductsToBuy = Math.min(amount, maxAffordable, (maxCañones[db[group].level] - db[group]['boat']['Cañones']));
    } else if (product === 'Municion') {
      maxProductsToBuy = Math.min(amount, maxAffordable, (maxMunicion[db[group].level] - db[group]['boat']['Municion']));
    } else {
      maxProductsToBuy = Math.min(amount, maxAffordable, maxCapacity - boatCapacity);
    }
    if (maxProductsToBuy > 0) {
      db[group]['boat'][product] += parseInt(maxProductsToBuy);
      db[group].money -= unitary_price * maxProductsToBuy;
    } else {
      console.error('No se puede comprar');
      return res.status(400).json({
        success: false,
        error: 'No se puede comprar',
        result: null
      });
    }
    writeDB(db);
    return res.status(200).json({
      success: true,
      error: null,
      result: {
        product,
        balance: db[group]['boat'][product],
        money: db[group].money
      }
    })
  }
)

app.post('/products/sell',
  (req, res) => {
    const { body } = req;
    const {
      group,
      product,
      amount,
      unitary_price,
    } = body;

    console.log(`[POST] /products/sell group: ${group} product: ${product} amount: ${amount} unitary_price: ${unitary_price} `);
    const db = readDB();
    if (!db[group]) {
      console.error('El grupo no existe');
      return res.status(400).json({
        success: false,
        error: 'El grupo no existe',
        result: null
      });
    }
    if (!db[group].boat[product]) {
      console.error('El producto no existe');
      console.log(db[group].boat[product]);
      return res.status(400).json({
        success: false,
        error: 'El producto no existe',
        result: null
      });
    }

    let maxProductsToSell = 0;

    maxProductsToSell = Math.min(amount, db[group]['boat'][product]);
    if (maxProductsToSell > 0) {
      db[group]['boat'][product] -= parseInt(maxProductsToSell);
      db[group].money += unitary_price * maxProductsToSell;
    } else {
      console.error('No se puede Vender');
      return res.status(400).json({
        success: false,
        error: 'No se puede comprar',
        result: null
      });
    }
    writeDB(db);
    return res.status(200).json({
      success: true,
      error: null,
      result: {
        product,
        balance: db[group]['boat'][product],
        money: db[group].money
      }
    })
  }
)


app.listen(3000, () => {
  console.log('Servidor escuchando en el puerto 3000');
});