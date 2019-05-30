const express = require('express')
const bodyParser = require('body-parser')

const webScrappingSigaa = require('./webscrapping')

const app = express()

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

app.get('/', async (req, res) => {

    res.send('OK')

})

app.post('/api/buscarInformacoes', (req, res) => {

    webScrappingSigaa(req.body.login, req.body.password).then((result) => {
        res.send(result)
    })

})

app.listen(process.env.PORT || 3000)