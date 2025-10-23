require('dotenv').config()
const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express()
const port = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

const uri = `mongodb+srv://${process.env.DB_NAME}:${process.env.DB_PASS}@cluster0.dclhmji.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {

    const itemsCollection = client.db('lost-found').collection('items')
    const recoveredCollection = client.db('lost-found').collection('recovered')


    // add item
    app.post('/additem', async (req, res) => {
      const data = req.body
      const result = await itemsCollection.insertOne(data)
      res.send(result)
    })


    // get all unrecovered items & search
app.get('/AllIUnrecoveredItem', async (req, res) => {
  const { searchParams, sortParams } = req.query;

  // Base query: only items NOT recovered
  let query = { status: { $ne: "recovered" } }; // <-- important

  // Add search filtering if searchParams exists
  if (searchParams) {
    query = {
      ...query, // keep status filter
      $or: [
        { title: { $regex: searchParams, $options: "i" } },
        { location: { $regex: searchParams, $options: "i" } }
      ]
    };
  }

  // Sorting
  let sortQuery = {};
  if (sortParams === 'latest') {
    sortQuery = { date: -1 };
  } else if (sortParams === 'oldest') {
    sortQuery = { date: 1 }; // corrected "data" -> "date"
  } else if (sortParams === 'alphabetical') {
    sortQuery = { title: 1 };
  }

  try {
    const result = await itemsCollection.find(query).sort(sortQuery).toArray();
    res.send(result);
  } catch (error) {
    res.status(500).send({ success: false, error: error.message });
  }
});


// get all recovered items
app.get('/allRecoveredItem', async (req, res) => {
  const { searchParams, sortParams } = req.query;

  // Base query: only items NOT recovered
  let query = { }; // <-- important

  // Add search filtering if searchParams exists
  if (searchParams) {
    query = {
      ...query, // keep status filter
      $or: [
        { title: { $regex: searchParams, $options: "i" } },
        { location: { $regex: searchParams, $options: "i" } },
        { recoveredLocation: { $regex: searchParams, $options: "i" } },
        { category: { $regex: searchParams, $options: "i" } }
      ]
    };
  }

  // Sorting
  let sortQuery = {};
  if (sortParams === 'latest') {
    sortQuery = { recoverdDate: -1 };
  } else if (sortParams === 'oldest') {
    sortQuery = { recoverdDate: 1 }; // corrected "data" -> "date"
  } else if (sortParams === 'alphabetical') {
    sortQuery = { title: 1 };
  }

  try {
    const result = await recoveredCollection.find(query).sort(sortQuery).toArray();
    res.send(result);
  } catch (error) {
    res.status(500).send({ success: false, error: error.message });
  }
});



    // veiw details
    app.get('/details/:id', async (req, res) => {
      const id = req.params.id
      const filter = { _id: new ObjectId(id) }
      const result = await itemsCollection.findOne(filter)
      res.send(result)
    })


    // my items
    app.get('/myitem/:email', async (req, res) => {
      const email = req?.params.email
      const filter = { email: email }
      const result = await itemsCollection.find(filter).toArray()
      res.send(result)
    })


    // update item
    app.put('/myitem/:id', async (req, res) => {
      const id = req.params.id
      const filter = { _id: new ObjectId(id) }
      const options = { upsert: true };
      const updatedItem = req.body
      const updatedDoc = {
        $set: updatedItem
      }
      const result = await itemsCollection.updateOne(filter, updatedDoc, options)
      res.send(result)
    })

    // delete item
    app.delete('/myitem/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await itemsCollection.deleteOne(query)
      res.send(result)
    })

    // recovered items
    app.post('/recovered/:itemId', async (req, res) => {
      const id = req.params.itemId
      const data = req.body
      const result = await recoveredCollection.insertOne(data)

      if (result.acknowledged) {
        await itemsCollection.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: { status: "recovered" }
          }
        )
      }

      res.send(result)
    })


    // logged in user recovered item
    app.get('/recovered/:email', async (req, res) => {
      const email = req.params.email
      const filter = { recoveredemail: email }
      const result = await recoveredCollection.find(filter).toArray()
      res.send(result)
    })


    // latesst items sorted by date
    app.get('/latest', async (req, res) => {
      const query = { status: { $ne: "recovered" } }
      const result = await itemsCollection.find(query).sort({ date: -1 }).limit(8).toArray()
      res.send(result)
    })

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('finnd and lost')
})

app.listen(port, () => {
  console.log(`my server is running on port ${port}`);
})