const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');


const app = express();
const port = process.env.PORT || 5000;

app.use(bodyParser.urlencoded({extended: false}))

app.use(bodyParser.json());

//Mysql

// Listen on enviroment port or 5000

app.listen(port, ()=> console.log(`Listening on port ${port}`));

const pool = mysql.createPool({
    connectionLimit: 10,
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'dicommfl_portal_trial'
});


//Get all leaves in the database
app.get('',(req,res)=>{
    pool.getConnection((err, connection)=>{
        if(err) throw err
        console.log('connected as id ', connection.threadId)

        // query(sqlString, callback)

        connection.query('SELECT * FROM leave_forms', (err, rows)=>{
            connection.release(); // returns the connection to pool

            if(!err){
                res.send(rows)
            }
            else{
                console.log(err);
            }
        });
    });
});

//Get leave forms by ID 

app.get('/:id',(req,res)=>{
    pool.getConnection((err, connection)=>{
        if(err) throw err
        console.log('connected as id ', connection.threadId)

        // query(sqlString, callback)

        connection.query('SELECT * FROM leave_forms WHERE lv_id = ?',[req.params.id], (err, rows)=>{
            connection.release(); // returns the connection to pool

            if(!err){
                res.send(rows)
            }
            else{
                console.log(err);
            }
        });
    });
});


//Delete a record

app.delete('/:id', (req, res) => {

    pool.getConnection((err, connection) => {
        if(err) throw err
        connection.query('DELETE FROM leave_forms WHERE lv_id = ?', [req.params.id], (err, rows) => {
            connection.release() // return the connection to pool
            if (!err) {
                res.send(`Leave form with the record ID ${[req.params.id]} has been removed.`)
            } else {
                console.log(err)
            }
            
            console.log('The data from leave table are: \n', rows)
        })
    })
});

// Add a record
app.post('', (req, res) => {

    pool.getConnection((err, connection) => {
        if(err) throw err
        console.log(`connected as id ${connection.threadId}`);

        const params = req.body;

        connection.query('INSERT INTO leave_forms SET ?', params, (err, rows) => {
            connection.release() // return the connection to pool
            if (!err) {
                res.send(`Leave form with the record ID ${params.user_id} has been added.`)
            } else {
                console.log(err)
            }
            
            console.log('The data from leave table are: \n', rows)
        })
    })
});

// Update a record

app.put('', (req, res) => {

    pool.getConnection((err, connection) => {
        if(err) throw err
        console.log(`connected as id ${connection.threadId}`);

        const params = req.body;
  

        connection.query('UPDATE leave_forms SET ?', params, (err, rows) => {
            connection.release() // return the connection to pool
            if (!err) {
                res.send(`Leave form with the record ID ${params.user_id} has been added.`)
            } else {
                console.log(err)
            }
            
            console.log('The data from leave table are: \n', rows)
        })
    })
});




