const puppeteer = require('puppeteer')
const request = require('request')
// const fs = require('fs')



/*
*
*   DESENVOLVIDO POR: ALEXSANDER SOARES
*   EMAIL: alexsandersoares30@gmail.com
*
*/

// Faz webscrapping no sistema SIGAA
const webScrappingSigaa = async (usuario, senha) => {

  try{

    // cria navegador headless
    const browser = await puppeteer.launch({headless: false,  
      'args' : [
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    });
    const page = await browser.newPage()
    await page.setViewport({ width: 1000, height: 800 })

    console.log('Acessando o sistema...')

    // entrarNoSistema(page);

    // entra na pagina de login do sigaa
    await page.goto('https://sigaa.ufpi.br/sigaa/verTelaLogin.do')
    
    console.log('Concluido!\n')

    // espera 1 segundo para prossguir
    await page.waitFor(200)

    console.log('Entrando no sistema...')
    
    // define os valoes dos campos de login
    await page.evaluate(async (usuario, senha) => {
     
        document.querySelector('#conteudo > div.logon > form > table > tbody > tr:nth-child(1) > td > input[type=text]').value = usuario
        document.querySelector('#conteudo > div.logon > form > table > tbody > tr:nth-child(2) > td > input[type=password]').value = senha

    }, usuario, senha);

    // clica no botão 'entrar' para executar o formulario de login
    await page.click('#conteudo > div.logon > form > table > tfoot > tr > td > input[type=submit]')

    console.log('Concluido!\n')



    /*
    *   BUSCANDO FOTO DO ALUNO
    */

    await page.waitForSelector('#perfil-docente > div.pessoal-docente > div.foto > img')

    const linkImg = await page.evaluate(() => {
        const src = document.querySelector('#perfil-docente > div.pessoal-docente > div.foto > img').src

        return src
    })

    var foto = null

    request.get({url: linkImg, encoding: 'base64'}, (err, res) => {
        if(err) 
            console.log('Foto não encontrada')

        foto = res.body
    })



    /*
    *   BUSCANDO INFORMAÇÕES DAS TURMAS E SUAS RESPECTIVAS ATIVIDADES
    */

    console.log('Procurando turmas...')

    // espera até que os links das turmas estejam disponiveis no codigo fonte
    await page.waitForSelector('#turmas-portal > table > tbody > tr > td > form > a', {timeout: 60000})

    // busca todos os links das turmas que o aluno está cadastrado
    const linksTurmas = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('#turmas-portal > table > tbody > tr > .descricao > form > a'))
    })

    console.log('Concluido!\n')

    const turmas = []

    // acessa os links das turmas um por um e pega as informações das atividades
    for (var i = 0; i < linksTurmas.length; i++) {

        // espera 200ms para continuar
        await page.waitFor(200)

        let selector = ''
        
       // O id do primeiro link é diferente dos outros, por isso é feita essa verificação 
        if(i == 0)
            selector = '#form_acessarTurmaVirtual > a'
        else
            selector = '#form_acessarTurmaVirtualj_id_' + i + ' > a'


        // clica no link da turma
        await page.evaluate(selector => { document.querySelector(selector).click() }, selector) 

        // aguarda até que a pagina seja carregada
        await page.waitForNavigation({ timeout: 60000 })

        // espera até que os os links das atividades estejam diponiveis
        // await page.waitForSelector('.item > span')

        // espera até que o nome da turma esteja disponivel
        await page.waitForSelector('#linkNomeTurma')

        // Pega o nome da turma e as informações das atividades
        const atividades = await page.evaluate(() => {

            // pega o nome da turma
            const turma = document.querySelector('#linkNomeTurma').title

            console.log('Buscando atividades da turma: ' + turma)
            
            // percorre por todos os links das atividades e pega o titulo e a descrição de cada uma e adiciona a um array
            const listAtividades = [...document.querySelectorAll('.item > span')].map(elem => {

                console.log(elem);
                  if(elem.children.length === 0)
                        return {periodo: null}

                  //pega o titulo da atividade
                  const titulo = elem.children[0].innerText

                  let descriptionItem = elem.querySelector('.descricao-item');

                  if(!descriptionItem)
                    descriptionItem = elem.parentNode.querySelector('.descricao-item');
                  
                  let descricao = ""
                  if(descriptionItem)
                        descricao = descriptionItem.innerText   

                  // expressão regular para buscar data e hora dentro da descrição
                  const regex = /[0-9]{2}\/[0-9]{2}\/[0-9]{4} às ([0-9]{2}:[0-9]{2}|[0-9]h [0-9]|[0-9]{2}h [0-9]{2}|[0-9]h [0-9]{2}|[0-9]{2}h [0-9])/g

                  // array de datas encontradas
                  const datas = []

                  // busca a data dentro da descrição e adiona ao array de datas
                  var i
                  while(i = regex.exec(descricao)){
                    datas.push(descricao.substr(i.index, 20).replace(/[e ]+/g, '').split('às'))
                  }

                  // verifica se alguma data foi encontrada, se sim retorna um objeto com as datas, se não retorna nulo
                  const periodo = datas.length > 0 ? {inicio: datas[0], fim: datas[1]} : null

                  // retorna um objeto com o titulo e descrição da atividade
                  return {id: Math.random().toString(), titulo: titulo.trim(), periodo: periodo}
            })

            // remove os objetos indesejados do array, como links de videos, links para arquivos e etc.
            const atividadesTurma = listAtividades.filter(elem => {
                return elem.periodo != null
            })

            // retorna um objeto com o nome da turma e um array com os objetos com as informações das atividades da turma
            return {id: Math.random().toString(), turma: turma, atividades: atividadesTurma}
        })

        // adiciona a turma ao array
        turmas.push(atividades)

        // retorna para a pagina inicial com o link das turmas
        await page.goBack()

    }

    /*
    * BUSCANDO DADOS DO ALUNO
    */

    const infoAluno = await page.evaluate((foto) => {

        const nome = document.querySelector('#perfil-docente > p.info-docente > span > small > b').innerText
        const matricula = document.querySelector('#agenda-docente > table > tbody > tr:nth-child(1) > td:nth-child(2)').innerText
        const turno = document.querySelector('#agenda-docente > table > tbody > tr:nth-child(3) > td:nth-child(2)').innerText
        const curso = document.querySelector('#agenda-docente > table > tbody > tr:nth-child(2) > td:nth-child(2)').innerText
        const nivel = document.querySelector('#agenda-docente > table > tbody > tr:nth-child(4) > td:nth-child(2)').innerText
        const status = document.querySelector('#agenda-docente > table > tbody > tr:nth-child(5) > td:nth-child(2)').innerText
        const email = document.querySelector('#agenda-docente > table > tbody > tr:nth-child(6) > td:nth-child(2)').innerText
        const entrada = document.querySelector('#agenda-docente > table > tbody > tr:nth-child(7) > td:nth-child(2)').innerText
        
        var polo = ""
        if(document.querySelector('#agenda-docente > table > tbody > tr:nth-child(8) > td:nth-child(2)') != null)
            polo = document.querySelector('#agenda-docente > table > tbody > tr:nth-child(8) > td:nth-child(2)').innerText

        var tutor = ""
        if(document.querySelector('#agenda-docente > table > tbody > tr:nth-child(9) > td:nth-child(2)') != null)
            tutor = document.querySelector('#agenda-docente > table > tbody > tr:nth-child(9) > td:nth-child(2)').innerText

        var ira = ""
        if(document.querySelector('#agenda-docente > table > tbody > tr:nth-child(10) > td > table > tbody > tr:nth-child(2) > td:nth-child(2) > div'))
            ira = document.querySelector('#agenda-docente > table > tbody > tr:nth-child(10) > td > table > tbody > tr:nth-child(2) > td:nth-child(2) > div').innerText
        else    
            ira = document.querySelector('#agenda-docente > table > tbody > tr:nth-child(12) > td > table > tbody > tr:nth-child(2) > td:nth-child(2) > div').innerText

        return { foto, nome, turno, matricula, curso, nivel, status, email, entrada, polo, tutor, ira }

    }, foto)


    //BUSCA NOTAS DO ALUNO
    // await page.hover('#menu_form_menu_discente_j_id_jsp_1325243614_85_menu > table > tbody > tr > td:nth-child(1)');
    // await page.click('#cmSubMenuID1 > table > tbody > tr:nth-child(2)');

    // encerra o navegador headless
    browser.close()

    // retorna o array com todas as turmas e suas respectividas atividades
    return {infoAluno, turmas}
  

  }catch(err){


      console.log(err);

  }

};
 
module.exports = webScrappingSigaa