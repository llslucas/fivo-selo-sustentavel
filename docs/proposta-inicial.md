# Proposta Inicial do Projeto
#uce-8

- A proposta é desenvolver uma plataforma web que permita a compra de selos, inicialmente digitais, que serão aplicados nos produtos/embalagens da empresa compradora, visando principalmente impacto social.
- A ideia é permitir que uma empresa associe uma ação social à venda de seus produtos.  

## Exemplo de divulgação:

- “A cada unidade vendida, R$ 1,00 será destinado a uma instituição x”  
- O selo poderá ser utilizado na embalagem do produto e permitirá que o consumidor acesse informações sobre aquela iniciativa em uma página que será atrelada  à empresa no ato da compra.  
- O objetivo principal da plataforma será agregar transparência a esse tipo de ação, permitindo que o consumidor saiba qual empresa está participando, qual é a causa apoiada e acompanhe as informações disponibilizadas sobre as doações.

## Escopo Inicial do Projeto

- Neste primeiro momento, o foco será desenvolver apenas o necessário para iniciar e validar a plataforma. 
- A Fivo Lab não irá intermediar financeiramente as doações nesta etapa.
- A empresa participante será responsável por realizar a doação diretamente à instituição escolhida.
- A plataforma terá como foco principal:
	- Cadastro da empresa.
	- Cadastro da instituição que receberá doação.
	- Escolha da instituição ou causa beneficiada.
	- Geração de selo digital com IA.
	- Geração de QR Code para acesso à campanha.
	- Domínio principal com informações da iniciativa Fivo.
	- Disponibilização de informações e comprovantes relacionados às doações.    
  
### Funcionamento básico:

O fluxo inicial da plataforma seria:
1. A empresa realiza seu cadastro
2. A empresa cria uma iniciativa ou campanha
3. A empresa define a causa ou instituição que será beneficiada
4. Define a regra da doação (valor doado por unidade)
5. A empresa escolhe um modelo de selo de uma lista pré definida
6. A empresa insere o logo e demais informações necessárias
7. A plataforma gera o selo digital com um QR Code
8. A empresa utiliza o selo em seu produto ou embalagem
9. O consumidor acessa o QR Code
10. O consumidor é direcionado para uma página com as informações daquela campanha
11. A empresa poderá disponibilizar informações e comprovantes relacionados às doações realizadas
  
## Requisitos funcionais iniciais
  
### RF01: Cadastro de empresa

O sistema deverá permitir que uma empresa realize seu cadastro na plataforma 

Informações iniciais:
- nome da empresa
- CNPJ
- e-mail
- informações básicas de contato
- logo da empresa  

### RF02: Criação de campanha

A empresa deverá criar uma campanha de impacto social.  
A campanha deverá possuir informações como:
- nome
- descrição
- causa ou instituição beneficiada
- regra da doação

### RF03: Instituição beneficiada

- Inicialmente, a empresa deverá escolher uma instituição ou causa relacionada à campanha.  
- A definição sobre como será feita a validação e elegibilidade dessas instituições ficará inicialmente sob responsabilidade da Fivo Lab.  
- Para a primeira versão, pode ser utilizada uma lista simples de instituições cadastradas ou um cadastro administrado pela plataforma.
  
### RF04: Geração do selo

- A plataforma deverá permitir que a empresa gere um selo digital.  
- Inicialmente, serão disponibilizados 5 modelos de selo para escolha.  
- A empresa poderá:
	- selecionar um modelo
	- inserir sua logo
	- vincular o selo à campanha criada
	- gerar o arquivo para utilização em embalagens ou materiais digitais
- A geração livre de selos utilizando IA poderá ser avaliada futuramente.

### RF05: QR Code

- O selo deverá possuir um QR Code ou identificador que direcione o consumidor para uma página específica da campanha, uma página atribuída  à empresa no ato da compra do selo.  

### RF06: Página pública da campanha

- Cada campanha deverá possuir uma página pública contendo informações como:
	- empresa responsável
	- descrição da iniciativa
	- causa ou instituição beneficiada
	- regra da doação
	- informações disponibilizadas pela empresa
	- comprovantes relacionados às doações, quando disponíveis  
- O consumidor não precisará necessariamente realizar cadastro para visualizar essas informações.  

### RF07: Envio de comprovantes

- A empresa deverá poder enviar comprovantes ou documentos relacionados às doações realizadas. 
- Esses documentos poderão ser disponibilizados na página pública da campanha como forma de transparência.
- Nesta primeira versão, não será realizada validação automática dos comprovantes por IA ou blockchain.  

### RF08: Área da empresa

- A empresa deverá possuir uma área para acompanhar e gerenciar: 
	- seus dados
	- campanhas criadas
	- selos gerados
	- informações e comprovantes enviados 

### RF09: Página de divulgação de parceiros

- A plataforma deverá disponibilizar uma página pública destinada à divulgação das empresas parceiras cadastradas.  
- Para cada empresa parceira, poderão ser disponibilizadas informações como:
	- nome da empresa
	- logo
	- localização
	- informações básicas de contato
	- campanhas ou iniciativas vinculadas, quando disponíveis

## Tipos de usuários

1. Empresa.
2. Será responsável por criar e gerenciar suas iniciativas dentro da plataforma.
3. Consumidor.
4. Poderá acessar as informações das campanhas através do QR Code ou link disponibilizado.    
5. Inicialmente, não será necessário possuir cadastro.   
6. Administrador (Fivo Lab)
7. Será responsável pelo gerenciamento básico da plataforma, empresas e instituições cadastradas.      

## Requisitos não funcionais 

- A plataforma deverá:
	- funcionar como sistema web.	
	- possuir interface adaptada para celular e computador.	
	- possuir autenticação para empresas e administradores.	
	- proteger informações restritas dos usuários.	
	- permitir acesso público às páginas das campanhas.	
	- gerar links permanentes ou identificadores para acesso através do QR Code.
 
## Sugestões de Tecnologias:

- Backend: NestJS    
- Frontend: NextJS   

## Tópicos fora do escopo
 
- Para manter o projeto viável e permitir o início da plataforma, não farão parte desta primeira etapa:
	- aplicativo mobile	
	- intermediação financeira das doações	
	- gateway de pagamento	
	- transferência de valores para instituições	
	- blockchain	
	- validação de comprovantes por IA	
	- RFID ou etiquetas físicas antifraude	
	- análise de crédito das empresas	
	- assinatura digital com validade jurídica	
	- notificações push	
	- sistema de validação automática das instituições	
	- geração totalmente livre de selos por inteligência artificial	
	- mediação da venda de selos físicos
  
Essas funcionalidades poderão ser consideradas como possíveis evoluções futuras. 

## Monetização

- A ideia inicial de monetização está relacionada aos selos gerados pela plataforma:
	- Para utilizar o selo, a empresa precisa efetuar a compra do mesmo.    
	- É prevista a venda de selos físicos, impressos por uma gráfica parceira.    

## Possíveis evoluções futuras
  
- Após a validação da primeira versão, poderão ser estudadas funcionalidades como:
	- criação de selos utilizando IA
	- selos numerados ou individualizados	
	- validação automática de comprovantes	
	- utilização de blockchain para rastreabilidade	
	- intermediação de doações	
	- integração com meios de pagamento
	- lembretes por e-mail ou WhatsApp	
	- mecanismos adicionais contra fraude	
	- validação mais avançada das instituições	
	- páginas para localizar empresas e produtos participantes	
	- campanhas e rankings de impacto social	
	- monetização através da venda de selos físicos 
  

## Resumo da primeira versão  

- A primeira versão do projeto será focada no seguinte fluxo:
	- A empresa se cadastra na plataforma, cria uma iniciativa social, define a regra da doação, escolhe um modelo de selo e gera um QR Code.
	- O selo é aplicado ao produto ou embalagem.
	- O consumidor acessa o QR Code e visualiza informações sobre a iniciativa e, quando disponibilizados, os comprovantes relacionados às doações.
	- O objetivo inicial é criar uma forma simples para que empresas possam comunicar suas iniciativas de impacto social e oferecer maior transparência ao consumidor.


## Atualização 29/08/2026

- Instituição terá a mesma estrutura da empresa em cadastros, com a adição do documento para validar esta instituição.
- 1 Selo único por campanha, não haverá numeração de selos neste início de projeto.
- Cadastro self-service de instituição com validação do administrador.
- Não adicionar monetização em um primeiro momento, deixar em backlog.