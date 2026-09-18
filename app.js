(function(){
'use strict';
var KEY='recorrida_confinamento_v1',state=load(),selectedKey='',CAPACITY_PEN=160,penSelected=new Set();
function defaultPenBlocks(){return [{id:'01',name:'Bloco 01',lines:['A','B','C','D','E','F']},{id:'02',name:'Bloco 02',lines:['G','H','I','J','K']},{id:'03',name:'Bloco 03',lines:['L','M','N','O','P']}];}
function normalizedPenBlocks(saved){var standard=defaultPenBlocks();if(!Array.isArray(saved)||saved.length!==3)return standard;return standard.map(function(block,i){return {id:block.id,name:String((saved[i]||{}).name||block.name),lines:block.lines.slice()};});}
function defaults(){return {version:1,reportDate:'',importedAt:'',lots:[],notes:[],penBlocks:defaultPenBlocks(),shipmentPlans:[]};}
function load(){try{var d=JSON.parse(localStorage.getItem(KEY));if(d&&Array.isArray(d.lots)&&Array.isArray(d.notes))return Object.assign(defaults(),d,{penBlocks:normalizedPenBlocks(d.penBlocks),shipmentPlans:Array.isArray(d.shipmentPlans)?d.shipmentPlans:[]});}catch(e){}return defaults();}
function save(){localStorage.setItem(KEY,JSON.stringify(state));}
function el(id){return document.getElementById(id);}
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function norm(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim().toUpperCase();}
function number(v){var x=parseFloat(String(v||'').replace(/\./g,'').replace(',','.').replace(/[^0-9.-]/g,''));return isFinite(x)?x:0;}
function inputNumber(v){var s=String(v==null?'':v).trim();if(!s)return null;s=s.replace(/\s/g,'');if(s.indexOf(',')>=0)s=s.replace(/\./g,'').replace(',','.');var x=parseFloat(s.replace(/[^0-9.-]/g,''));return isFinite(x)?x:null;}
function int(v){return Math.round(Number(v)||0).toLocaleString('pt-BR');}
function decimal(v,d){return Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d});}
function dateIso(v){var p=String(v).split('/');return p.length===3?p[2]+'-'+p[1].padStart(2,'0')+'-'+p[0].padStart(2,'0'):'';}
function dateBr(v){if(!v)return '—';var p=v.split('-');return p.length===3?p[2]+'/'+p[1]+'/'+p[0]:v;}
function pad2(n){return String(n).padStart(2,'0');}
function tsFile(d){return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate())+'_'+pad2(d.getHours())+'-'+pad2(d.getMinutes())+'-'+pad2(d.getSeconds());}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7);}
function lotKey(l){return norm(l.name)+'|'+String(l.entryDate||l.entryDateRaw||'');}
function typeLabel(t){return t==='own'?'Próprio':(t==='partnership'?'Parceria':'Boitel');}
function ownerLabel(l){return (l.proprietario&&l.proprietario!=='-')?l.proprietario:l.category;}
function entryDateLabel(l){if(l.entryDate)return dateBr(l.entryDate);if(l.entryDateRaw)return l.entryDateRaw+' (ano não exibido no relatório)';return '—';}
function parseEntryDate(text){var full=text.match(/\d{1,2}\/\d{1,2}\/\d{4}/);if(full)return {iso:dateIso(full[0]),raw:full[0]};var partial=text.match(/\d{1,2}\/\d{1,2}\/\d{1,3}\.{0,3}/);if(partial)return {iso:'',raw:partial[0]};return {iso:'',raw:''};}
function activeNotes(l){var lk=lotKey(l);return state.notes.filter(function(n){return n.status==='active'&&((n.scope==='lot'&&n.targetKey===lk)||(n.scope==='pen'&&n.targetKey===l.pen));});}
function shipmentFor(l){var key=lotKey(l);return (state.shipmentPlans||[]).find(function(p){return p.lotKey===key;})||null;}
function parseShipmentDate(v){var s=String(v||'').trim(),m=s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);if(m)return m[3]+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0');m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);return m?m[1]+'-'+m[2].padStart(2,'0')+'-'+m[3].padStart(2,'0'):'';}
function csvField(v){var s=String(v==null?'':v);return /[;"\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;}
function csvSafe(v){var s=String(v==null?'':v);if(/^[=+\-@]/.test(s))s="'"+s;return csvField(s);}
function parseCsv(text){var rows=[],row=[],cell='',quoted=false,s=String(text||'').replace(/^﻿/,'');for(var i=0;i<s.length;i++){var c=s[i];if(quoted){if(c==='"'&&s[i+1]==='"'){cell+='"';i++;}else if(c==='"')quoted=false;else cell+=c;}else if(c==='"')quoted=true;else if(c===';'){row.push(cell);cell='';}else if(c==='\n'){row.push(cell.replace(/\r$/,''));rows.push(row);row=[];cell='';}else cell+=c;}if(cell||row.length){row.push(cell.replace(/\r$/,''));rows.push(row);}return rows;}
async function importShipmentPlan(e){
  var f=e.target.files&&e.target.files[0];if(!f)return;
  try{
    var rows=parseCsv(await f.text()),headerAt=rows.findIndex(function(r){return norm(r[0])==='ENVIAR';});
    if(headerAt<0)throw new Error('Use a planilha de programação de abate exportada pela Recorrida ou pelo Control Conf.');
    rows=rows.slice(headerAt);if(rows.length<2)throw new Error('A planilha está vazia.');
    var headers=rows.shift().map(norm),colPart=function(name){return headers.findIndex(function(h){return h.indexOf(norm(name))>=0;});};
    var iSend=colPart('Enviar'),iLot=colPart('Lote'),iQty=colPart('Quantidade para abate'),iDate=colPart('Data do embarque'),iNote=colPart('Observação'),iKey=colPart('Identificador');
    if(iLot<0||iDate<0)throw new Error('Use a planilha de programação de abate exportada pela Recorrida ou pelo Control Conf.');
    var current={},byName={};state.lots.forEach(function(l){current[lotKey(l)]=l;byName[norm(l.name)]=l;});
    var updated=0,removed=0,errors=[];
    rows.forEach(function(r,n){
      if(!r.some(function(v){return String(v||'').trim();}))return;
      var lotName=String(r[iLot]||'').trim(),key=iKey>=0?String(r[iKey]||'').trim():'',lot=current[key]||byName[norm(lotName)],send=norm(iSend>=0?r[iSend]:'SIM');
      if(!lotName){errors.push('lote obrigatório na linha '+(n+5));return;}
      if(!lot){errors.push('lote "'+lotName+'" não encontrado');return;}
      key=lotKey(lot);
      var existing=state.shipmentPlans.findIndex(function(p){return p.lotKey===key;});
      if(send==='NAO'||send==='REMOVER'){if(existing>=0){state.shipmentPlans.splice(existing,1);removed++;}return;}
      var date=parseShipmentDate(r[iDate]);if(!date){errors.push('data obrigatória para '+lotName+' em DD/MM/AAAA');return;}
      var quantity=Math.max(1,Math.min(Number(lot.quantity)||0,Math.round(inputNumber(iQty>=0?r[iQty]:'')||Number(lot.quantity)||0)));
      var plan={lotKey:key,lotName:lot.name,pen:lot.pen,shipmentDate:date,quantity:quantity,note:String(iNote>=0?r[iNote]||'':'').trim(),importedAt:new Date().toISOString()};
      if(existing>=0)state.shipmentPlans[existing]=plan;else state.shipmentPlans.push(plan);
      updated++;
    });
    save();render();
    if(errors.length)showToast(updated+' programações importadas. Corrija: '+errors.slice(0,3).join('; ')+'.');
    else showToast(updated+' programações importadas'+(removed?' e '+removed+' removidas':'')+'.');
  }catch(err){showToast(err.message||'Não foi possível importar a programação.');}finally{e.target.value='';}
}
function showToast(msg){var t=el('toast');t.textContent=msg;t.classList.add('show');clearTimeout(showToast.timer);showToast.timer=setTimeout(function(){t.classList.remove('show');},2800);}
function categoryIsOwn(v){var c=norm(v);return c==='RIP'||c==='TORETON'||c==='COMPRAS';}
function classifyType(rawType,category){var t=norm(rawType);if(/^PARCERIA/.test(t))return 'partnership';if(/^(ANIMAIS?\b|COMPRA)/.test(t))return 'own';if(/^BOITEL/.test(t))return 'boitel';return categoryIsOwn(category)?'own':'boitel';}
function excelDateToIso(v){if(v instanceof Date&&!isNaN(v))return v.getUTCFullYear()+'-'+pad2(v.getUTCMonth()+1)+'-'+pad2(v.getUTCDate());var s=String(v==null?'':v).trim(),m=s.match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);return m?m[3]+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0'):'';}
function stripDietDate(v){return String(v==null?'':v).replace(/\s*\d{1,2}\/\d{1,2}\/\d{4}\s*$/,'').trim();}
function fieldGetter(row){var map={};Object.keys(row).forEach(function(k){map[norm(k)]=k;});return function(name){var key=map[norm(name)];return key===undefined?'':row[key];};}
function parseExcelRows(rows){
  // Lê a planilha "Lotes Ativos" do Bovino.OS pelo NOME das colunas (não pela posição), então
  // uma mudança de ordem ou de layout não quebra a importação — só usamos as colunas que precisamos.
  var out=[],reportDate='';
  rows.forEach(function(row){
    var get=fieldGetter(row),rawLine=String(get('Linha')||'').trim().toUpperCase(),line=rawLine.replace(/^LINHA\s+/,'').trim();
    if(!reportDate){var dm=String(get('Dieta')||'').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s*$/);if(dm)reportDate=dm[3]+'-'+dm[2].padStart(2,'0')+'-'+dm[1].padStart(2,'0');}
    if(!line||line==='PASTO')return;
    var name=String(get('Lote')||'').trim();if(!/^(LOTE|ENFERMARIA)\b/i.test(name))return;
    var pen=String(get('Curral')||'').trim(),qty=Math.round(Number(get('Cab.'))||0);if(!qty)return;
    var rawType=String(get('Tipo de entrada')||'').trim(),category=String(get('Categoria')||'').trim(),type=classifyType(rawType,category);
    var entryIso=excelDateToIso(get('1ª Entrada'));
    out.push({name:name,pen:pen,line:line,quantity:qty,deaths:Math.round(Number(get('Mortes'))||0),breed:String(get('Raça')||'').trim(),category:category,proprietario:String(get('Proprietário')||'').trim(),rawType:rawType,type:type,diet:stripDietDate(get('Dieta'))||'NÃO INFORMADA',entryDate:entryIso,entryDateRaw:entryIso?'':String(get('1ª Entrada')||'').trim(),days:Math.round(Number(get('D. conf.'))||0),treatmentDays:Math.round(Number(get('D. trato'))||0),entryWeight:Number(get('Peso Ent.'))||0,gmd:Number(get('GMD'))||0,estimatedWeight:Number(get('Peso Est.'))||0,exitWeight:Number(get('Peso Saída'))||0,estimatedExit:excelDateToIso(get('Data Saída Est.')),consumptionMS:Number(get('kg/cab (MS)'))||0,consumption:Number(get('kg/cab (MN)'))||0,pv:(Number(get('%PV (MS)'))||0)*100});
  });
  return {lots:out,reportDate:reportDate};
}
async function importExcel(file){
  showToast('Lendo a planilha de lotes ativos...');
  var XLSXLib=window.XLSX;if(!XLSXLib)throw new Error('Leitor de planilha indisponível.');
  var wb=XLSXLib.read(new Uint8Array(await file.arrayBuffer()),{type:'array',cellDates:true}),sheet=wb.Sheets[wb.SheetNames[0]];
  if(!sheet)throw new Error('A planilha não tem nenhuma aba legível.');
  var rows=XLSXLib.utils.sheet_to_json(sheet,{defval:'',raw:true});
  if(!rows.length)throw new Error('A planilha está vazia.');
  var headerKeys=Object.keys(rows[0]).map(norm);
  if(headerKeys.indexOf('LINHA')<0||headerKeys.indexOf('LOTE')<0)throw new Error('Use a planilha de Lotes Ativos exportada pelo Bovino.OS, com as colunas Linha e Lote.');
  var parsed=parseExcelRows(rows);
  if(!parsed.lots.length)throw new Error('Nenhum lote dos currais A a P foi reconhecido na planilha.');
  state.lots=parsed.lots;state.reportDate=parsed.reportDate;state.importedAt=new Date().toISOString();save();selectedKey='';render();
  showToast(parsed.lots.length+' lotes e '+int(sum(parsed.lots,'quantity'))+' animais atualizados. As anotações foram preservadas.');
}
function sum(rows,key){return rows.reduce(function(s,r){return s+Number(typeof key==='function'?key(r):r[key]||0);},0);}
function kpi(label,value,sub,cls,action){var tag=action?'button':'div';return '<'+tag+' class="kpi '+(cls||'')+(action?' clickable':'')+'"'+(action?' data-kpi="'+action+'" type="button"':'')+'><span>'+label+'</span><strong>'+value+'</strong><small>'+sub+(action?' · toque para filtrar':'')+'</small></'+tag+'>';}
function filtered(){var q=norm(el('searchFilter').value),line=el('lineFilter').value,diet=el('dietFilter').value,type=el('typeFilter').value,note=el('noteFilter').value,min=inputNumber(el('consMin').value),max=inputNumber(el('consMax').value),daysMin=inputNumber(el('daysMin').value),daysMax=inputNumber(el('daysMax').value),shipmentDate=el('shipmentDateFilter').value;return state.lots.filter(function(l){var notes=activeNotes(l).length,search=!q||norm(l.name+' '+l.pen+' '+l.line+' '+l.category+' '+l.proprietario).indexOf(q)>=0,shipment=shipmentFor(l);return search&&(!line||l.line===line)&&(!diet||norm(l.diet)===diet)&&(!type||l.type===type)&&(!note||(note==='active'?notes>0:notes===0))&&(min===null||l.pv>=min)&&(max===null||l.pv<=max)&&(daysMin===null||l.days>=daysMin)&&(daysMax===null||l.days<=daysMax)&&(!shipmentDate||(shipmentDate==='none'?!shipment:!!shipment&&shipment.shipmentDate===shipmentDate));});}
function fillFilters(){var line=el('lineFilter').value,diet=el('dietFilter').value,block=el('blockFilter').value,shipmentDate=el('shipmentDateFilter').value,lines=Array.from(new Set(state.lots.map(function(l){return l.line;}))).filter(Boolean).sort(),diets=Array.from(new Set(state.lots.map(function(l){return norm(l.diet);}))).filter(Boolean).sort(),shipDates=Array.from(new Set((state.shipmentPlans||[]).map(function(p){return p.shipmentDate;}))).filter(Boolean).sort();el('lineFilter').innerHTML='<option value="">Todas</option>'+lines.map(function(x){return '<option value="'+x+'">Linha '+x+'</option>';}).join('');el('dietFilter').innerHTML='<option value="">Todas</option>'+diets.map(function(x){return '<option value="'+esc(x)+'">'+esc(x)+'</option>';}).join('');el('blockFilter').innerHTML='<option value="">Todos</option>'+state.penBlocks.map(function(b){return '<option value="'+esc(b.id)+'">'+esc(b.name)+'</option>';}).join('');el('shipmentDateFilter').innerHTML='<option value="">Todas</option><option value="none">Sem programação</option>'+shipDates.map(function(d){return '<option value="'+d+'">'+dateBr(d)+'</option>';}).join('');el('lineFilter').value=line;el('dietFilter').value=diet;el('blockFilter').value=block;el('shipmentDateFilter').value=shipmentDate;}
function render(){fillFilters();var rows=filtered(),term=state.lots.filter(function(l){return norm(l.diet)==='TERMINACAO';}),termLow=term.filter(function(l){return l.pv<1.8;}),notes=state.notes.filter(function(n){return n.status==='active';});el('positionLabel').textContent=state.reportDate?'Posição em '+dateBr(state.reportDate)+' · atualizado '+new Date(state.importedAt).toLocaleString('pt-BR'):'Nenhum relatório importado';
  var fullMap=buildPenMap(state.lots),allPens=[];
  state.penBlocks.forEach(function(block){block.lines.forEach(function(line){for(var n=1;n<=10;n++){var num=pad2(n),key=line+num;allPens.push(fullMap[key]||{line:line,number:num,lots:[],quantity:0,types:{own:0,boitel:0,partnership:0}});}});});
  var occupied=allPens.filter(function(p){return p.quantity>0;}),empty=allPens.length-occupied.length,animalsHoused=sum(occupied,'quantity'),internal=sum(occupied,function(p){return Math.max(0,CAPACITY_PEN-p.quantity);}),plannedVacant=occupied.filter(function(p){return p.lots.length&&p.lots.every(function(l){var s=shipmentFor(l);return s&&Number(s.quantity)>=Number(l.quantity);});});
  el('summary').innerHTML=kpi('Capacidade física',int(allPens.length*CAPACITY_PEN),allPens.length+' currais × '+CAPACITY_PEN)+kpi('Animais alojados',int(animalsHoused),occupied.length+' currais ocupados')+kpi('Capacidade operacional livre',int(empty*CAPACITY_PEN),empty+' currais vazios × '+CAPACITY_PEN,'gold')+kpi('Vagas após embarques',int((empty+plannedVacant.length)*CAPACITY_PEN),plannedVacant.length+' currais com saída total programada','green')+kpi('Espaço perdido',int(internal),'dentro de currais já ocupados','blue')+kpi('Consumo abaixo de 1,8% (terminação)',int(sum(termLow,'quantity')),'animais em terminação para observar','red','cons-low')+kpi('Anotações ativas',int(notes.length),'acompanhamentos pendentes','blue','notes-active');
  el('resultCount').textContent=rows.length+' '+(rows.length===1?'curral':'currais');el('resultAnimals').textContent=int(sum(rows,'quantity'))+' animais';renderShipmentSchedule();renderPenMap(rows);updatePenSelectionBar();}
function penNumber(l){var m=String(l.pen||'').match(/(\d{1,2})\s*$/);return m?m[1].padStart(2,'0'):'';}
function hasActiveFilters(){return !!(el('searchFilter').value.trim()||el('dietFilter').value||el('typeFilter').value||el('noteFilter').value||el('consMin').value.trim()||el('consMax').value.trim()||el('daysMin').value.trim()||el('daysMax').value.trim()||el('shipmentDateFilter').value);}
function buildPenMap(rows){var map={};rows.forEach(function(l){var num=penNumber(l);if(!num)return;var key=l.line+num;if(!map[key])map[key]={line:l.line,number:num,lots:[],quantity:0,types:{own:0,boitel:0,partnership:0}};map[key].lots.push(l);map[key].quantity+=Number(l.quantity)||0;map[key].types[l.type]=(map[key].types[l.type]||0)+(Number(l.quantity)||0);});return map;}
function penStatus(pen){if(!pen.quantity)return 'empty';if(pen.quantity>CAPACITY_PEN)return 'over';if(pen.quantity===CAPACITY_PEN)return 'full';return 'partial';}
function penStatusTitle(status,free){return status==='empty'?'Curral disponível':status==='over'?'Capacidade ultrapassada':status==='full'?'Curral lotado':free+' lugar'+(free===1?'':'es')+' perdido'+(free===1?'':'s');}
function dominantType(types){var own=types.own||0,other=(types.boitel||0)+(types.partnership||0);return own>=other?'own':'boitel';}
function penLotRow(l){var notes=activeNotes(l).length,key=lotKey(l),checked=penSelected.has(key),alert=l.pv<1.8||l.pv>2.5,shipment=shipmentFor(l);return '<div class="pen-lot-row'+(alert?' alert':'')+(notes?' has-note':'')+(shipment?' scheduled':'')+'" data-pen-lot="'+esc(key)+'">'+'<label class="pen-lot-select" title="Selecionar para exportar" onclick="event.stopPropagation()"><input type="checkbox" data-pen-select="'+esc(key)+'"'+(checked?' checked':'')+'></label>'+'<div class="pen-lot-main"><span class="pen-lot-name">'+esc(l.name)+' · '+int(l.quantity)+' · '+typeLabel(l.type)+'</span><span class="pen-lot-meta">'+esc(l.diet||'—')+' · '+decimal(l.pv,2)+'% PV · '+int(l.days)+'d conf.'+(notes?' · ● '+notes+' anot.':'')+'</span></div>'+(shipment?'<span class="shipment-badge">Embarque '+dateBr(shipment.shipmentDate)+' · '+int(shipment.quantity)+' animais</span>':'')+'</div>';}
function penCard(pen){var status=penStatus(pen),cls=status==='empty'?'empty':(status==='over'?'over':dominantType(pen.types)),hasShipment=pen.lots.some(function(l){return !!shipmentFor(l);}),free=Math.max(0,CAPACITY_PEN-pen.quantity),title=penStatusTitle(status,free),owners=Array.from(new Set(pen.lots.map(function(l){return String(ownerLabel(l)||'').trim();}).filter(Boolean))),ownerHtml=status!=='empty'&&owners.length?'<span class="pen-owner" title="Proprietário / categoria">'+esc(owners.join(' + '))+'</span>':'',code=pen.line+pen.number;return '<article class="pen-card '+cls+(hasShipment?' scheduled':'')+'"><div class="pen-top"><span class="pen-code">'+esc(code)+'</span><span class="pen-status">'+(hasShipment?'Saída programada':esc(title))+'</span></div>'+ownerHtml+(status==='empty'?'<div class="pen-empty-mark">Livre</div>':'<div class="pen-qty"><strong>'+int(pen.quantity)+'</strong><span> de '+CAPACITY_PEN+' animais</span></div><div class="pen-meter"><i style="width:'+Math.min(100,pen.quantity/CAPACITY_PEN*100)+'%"></i></div><div class="pen-lots">'+pen.lots.map(penLotRow).join('')+'</div>')+'</article>';}
function renderPenMap(rows){
  var blockSel=el('blockFilter').value,lineSel=el('lineFilter').value,statusSel=el('statusFilter').value,filtersActive=hasActiveFilters(),map=buildPenMap(rows);
  var blocksHtml=state.penBlocks.filter(function(b){return !blockSel||b.id===blockSel;}).map(function(block){
    var lines=block.lines.filter(function(line){return !lineSel||line===lineSel;});
    var lineHtml=lines.map(function(line){
      var pens=[];
      for(var n=1;n<=10;n++){
        var num=pad2(n),key=line+num,pen=map[key]||{line:line,number:num,lots:[],quantity:0,types:{own:0,boitel:0,partnership:0}};
        var status=penStatus(pen),contentMatch=!filtersActive||pen.quantity>0,statusMatch=!statusSel||status===statusSel;
        if(contentMatch&&statusMatch)pens.push(pen);
      }
      if(!pens.length)return '';
      var occ=pens.filter(function(p){return p.quantity>0;}).length;
      return '<section class="pen-line"><div class="pen-line-head"><strong>Linha '+line+'</strong><span>'+occ+' ocupad'+(occ===1?'a':'as')+'</span></div><div class="pen-grid">'+pens.map(penCard).join('')+'</div></section>';
    }).join('');
    if(!lineHtml)return '';
    return '<section class="pen-block"><div class="pen-block-head"><div><span class="section-tag">SETOR '+esc(block.id)+'</span><input data-pen-block-name="'+esc(block.id)+'" value="'+esc(block.name)+'" maxlength="30" aria-label="Nome do bloco '+esc(block.id)+'"></div><span>Linhas '+block.lines[0]+'–'+block.lines[block.lines.length-1]+'</span></div>'+lineHtml+'</section>';
  }).join('');
  el('penMap').innerHTML=blocksHtml||'<div class="empty-state">Nenhum curral corresponde aos filtros escolhidos.</div>';
}
function currentLot(){return state.lots.find(function(l){return lotKey(l)===selectedKey;});}
function deleteShipmentPlan(key){if(!key)return;var idx=state.shipmentPlans.findIndex(function(p){return p.lotKey===key;});if(idx<0)return;if(!confirm('Excluir esta programação de embarque? O lote volta para a situação normal.'))return;state.shipmentPlans.splice(idx,1);save();render();renderDetail();showToast('Programação de embarque excluída.');}
function detailItem(label,value){return '<div class="detail-item"><span>'+label+'</span><strong>'+esc(value==null||value===''?'—':value)+'</strong></div>';}
function renderDetail(){var l=currentLot();if(!l){el('drawer').hidden=true;return;}el('detailTitle').textContent='Curral '+l.pen+' · '+l.name;var lk=lotKey(l),shipment=shipmentFor(l),related=state.notes.filter(function(n){return (n.scope==='lot'&&n.targetKey===lk)||(n.scope==='pen'&&n.targetKey===l.pen);}).sort(function(a,b){return b.createdAt.localeCompare(a.createdAt);});el('detailBody').innerHTML=(shipment?'<div class="shipment-detail"><div><strong>Embarque programado para '+dateBr(shipment.shipmentDate)+'</strong><span>'+int(shipment.quantity)+' animais'+(shipment.note?' - '+esc(shipment.note):'')+'</span></div><button type="button" class="shipment-delete" data-delete-shipment="'+esc(lk)+'" title="Excluir esta programacao de embarque" aria-label="Excluir programacao de embarque">x</button></div>':'')+'<div class="detail-hero"><div class="detail-box"><span>Animais</span><strong>'+int(l.quantity)+'</strong></div><div class="detail-box"><span>Dieta</span><strong>'+esc(l.diet)+'</strong></div><div class="detail-box"><span>Consumo %PV</span><strong>'+decimal(l.pv,2)+'%</strong></div><div class="detail-box"><span>Dias confinamento</span><strong>'+int(l.days)+'</strong></div></div><div class="detail-grid">'+detailItem('Proprietário',l.proprietario&&l.proprietario!=='-'?l.proprietario:'—')+detailItem('Categoria',l.category)+detailItem('Tipo',typeLabel(l.type))+detailItem('Raça',l.breed)+detailItem('Entrada',entryDateLabel(l))+detailItem('Peso entrada',decimal(l.entryWeight,1)+' kg')+detailItem('Peso estimado',decimal(l.estimatedWeight,1)+' kg')+detailItem('Peso de saída',decimal(l.exitWeight,1)+' kg')+detailItem('Saída estimada',dateBr(l.estimatedExit))+detailItem('GMD',decimal(l.gmd,2)+' kg/dia')+detailItem('Consumo MS',decimal(l.consumptionMS,2)+' kg/cab')+detailItem('Consumo MN',decimal(l.consumption,2)+' kg/cab')+detailItem('Dias de trato',int(l.treatmentDays))+detailItem('Mortes',int(l.deaths))+'</div><div class="notes-layout"><form class="note-form" id="noteForm"><h3>Nova anotação</h3><label>A anotação acompanha<select name="scope"><option value="lot">Este lote, mesmo se mudar de curral</option><option value="pen">Este curral</option></select></label><label>Anotação<textarea name="text" required placeholder="Registre o que foi observado e o que precisa ser acompanhado."></textarea></label><div class="note-actions"><button class="btn primary" type="submit">Salvar anotação</button><button class="btn secondary" type="button" id="closePenNotes">Concluir anotações do curral</button></div></form><section class="notes-panel"><h3>Histórico</h3>'+(related.length?related.map(noteCard).join(''):'<div class="empty-state">Nenhuma anotação registrada.</div>')+'</section></div>';el('noteForm').onsubmit=addNote;el('closePenNotes').onclick=closePenNotes;}
function noteCard(n){return '<article class="note-card '+(n.status==='closed'?'closed':'')+'">'+(n.status==='active'?'<button data-close-note="'+n.id+'">Concluir</button>':'')+'<small>'+(n.scope==='lot'?'LOTE':'CURRAL')+' · '+new Date(n.createdAt).toLocaleString('pt-BR')+(n.closedAt?' · concluída '+new Date(n.closedAt).toLocaleString('pt-BR'):'')+'</small><p>'+esc(n.text)+'</p></article>';}
function addNote(e){e.preventDefault();var l=currentLot(),fd=new FormData(e.target),scope=fd.get('scope'),text=String(fd.get('text')||'').trim();if(!l||!text)return;state.notes.push({id:uid(),scope:scope,targetKey:scope==='lot'?lotKey(l):l.pen,lotName:l.name,pen:l.pen,text:text,status:'active',createdAt:new Date().toISOString(),closedAt:''});save();render();renderDetail();showToast('Anotação salva.');}
function conclude(id){var n=state.notes.find(function(x){return x.id===id;});if(!n)return;n.status='closed';n.closedAt=new Date().toISOString();save();render();renderDetail();showToast('Anotação concluída e mantida no histórico.');}
function closePenNotes(){var l=currentLot(),list=state.notes.filter(function(n){return n.status==='active'&&n.scope==='pen'&&n.targetKey===l.pen;});if(!list.length){showToast('Este curral não possui anotação ativa.');return;}if(!confirm('Concluir as '+list.length+' anotações ativas deste curral? Elas continuarão no histórico.'))return;list.forEach(function(n){n.status='closed';n.closedAt=new Date().toISOString();});save();render();renderDetail();showToast('Anotações do curral concluídas.');}
function clearFilters(){['searchFilter','blockFilter','lineFilter','dietFilter','typeFilter','statusFilter','noteFilter','consMin','consMax','daysMin','daysMax','shipmentDateFilter'].forEach(function(id){el(id).value='';});render();}
function download(name,text,type){var b=new Blob([text],{type:type||'application/json'}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(u);},500);}
function penSelectedLots(){var valid={};state.lots.forEach(function(l){valid[lotKey(l)]=l;});Array.from(penSelected).forEach(function(k){if(!valid[k])penSelected.delete(k);});return Array.from(penSelected).map(function(k){return valid[k];}).filter(Boolean);}
function penExportRows(){return penSelectedLots().sort(function(a,b){return (a.line+a.pen).localeCompare(b.line+b.pen,undefined,{numeric:true});});}
function updatePenSelectionBar(){var lots=penExportRows(),bar=el('penSelectionBar');if(!bar)return;if(!lots.length){bar.hidden=true;return;}bar.hidden=false;el('penSelectionSummary').textContent=lots.length+' lote'+(lots.length===1?'':'s')+' selecionado'+(lots.length===1?'':'s')+' · '+int(sum(lots,'quantity'))+' animais';el('penSelectionChips').innerHTML=lots.map(function(l){return '<span class="selection-chip">'+esc(l.pen)+' · '+esc(l.name)+'<button type="button" data-pen-deselect="'+esc(lotKey(l))+'" title="Remover da seleção" aria-label="Remover">×</button></span>';}).join('');}
function exportPenPrint(){var lots=penExportRows();if(!lots.length){showToast('Selecione ao menos um lote para exportar.');return;}var rows=lots.map(function(l){return '<tr><td>'+esc(l.line)+'</td><td>'+esc(l.pen)+'</td><td>'+esc(l.name)+'</td><td>'+esc(ownerLabel(l))+'</td><td>'+typeLabel(l.type)+'</td><td>'+esc(l.breed||'')+'</td><td>'+esc(l.diet||'')+'</td><td>'+int(l.quantity)+'</td><td>'+decimal(l.pv,2)+'%</td><td>'+int(l.days)+'</td><td>'+decimal(l.estimatedWeight,1)+'</td><td>'+dateBr(l.estimatedExit)+'</td></tr>';}).join('');el('penPrintArea').innerHTML='<h1>Recorrida do Confinamento — Lotes selecionados (Mapa dos Currais)</h1><p>Posição em '+dateBr(state.reportDate)+' · gerado em '+new Date().toLocaleString('pt-BR')+' · '+lots.length+' lote'+(lots.length===1?'':'s')+' · '+int(sum(lots,'quantity'))+' animais</p><table><thead><tr><th>Linha</th><th>Curral</th><th>Lote</th><th>Categoria/Dono</th><th>Tipo</th><th>Raça</th><th>Dieta</th><th>Animais</th><th>Consumo %PV</th><th>Dias conf.</th><th>Peso est. (kg)</th><th>Saída estimada</th></tr></thead><tbody>'+rows+'</tbody></table>';document.body.classList.add('print-pens');window.print();}
function exportShipmentTemplate(){var lots=penExportRows();if(!lots.length){showToast('Selecione no mapa os lotes que serão programados.');return;}var title=['Programação de Abate Confinamento Ypoti','','','','','','','','','','',''],instruction=['Preenchimento obrigatório: mantenha o lote exatamente como consta no relatório e informe a data de embarque em DD/MM/AAAA.','','','','','','','','','','',''],head=['Enviar','Linha','Curral','Lote','Data de entrada','Categoria/Dono','Tipo','Animais do lote','Quantidade para abate','Data do embarque (DD/MM/AAAA)','Observação','Identificador'];var rows=lots.map(function(l){var p=shipmentFor(l);return ['SIM',l.line,l.pen,l.name,dateBr(l.entryDate),ownerLabel(l),typeLabel(l.type),l.quantity,p?p.quantity:l.quantity,p?dateBr(p.shipmentDate):'',p?p.note:'',lotKey(l)].map(csvSafe).join(';');});var content=[title.map(csvSafe).join(';'),instruction.map(csvSafe).join(';'),'',head.join(';')].concat(rows).join('\r\n');download('Programacao_de_Abate_Confinamento_Ypoti_'+new Date().toISOString().slice(0,10)+'.csv','﻿'+content,'text/csv');showToast('Planilha criada com datas em DD/MM/AAAA. Lote e data de embarque são obrigatórios. Pode ser reimportada aqui ou no Control Conf.');}
function exportPenCsv(){var lots=penExportRows();if(!lots.length){showToast('Selecione ao menos um lote para exportar.');return;}var head=['Linha','Curral','Lote','Categoria/Dono','Tipo','Raça','Dieta','Animais','Consumo %PV','Dias confinamento','Peso estimado (kg)','Saída estimada'],rows=lots.map(function(l){return [l.line,l.pen,l.name,ownerLabel(l),typeLabel(l.type),l.breed||'',l.diet||'',l.quantity,decimal(l.pv,2),l.days,decimal(l.estimatedWeight,1),dateBr(l.estimatedExit)].map(csvField).join(';');});download('Lotes_selecionados_'+Date.now()+'.csv','﻿'+[head.join(';')].concat(rows).join('\r\n'),'text/csv');showToast(lots.length+' lote'+(lots.length===1?'':'s')+' exportado'+(lots.length===1?'':'s')+' em CSV.');}
function renderShipmentSchedule(){var current={};state.lots.forEach(function(l){current[lotKey(l)]=l;});var groups={};(state.shipmentPlans||[]).forEach(function(p){var l=current[p.lotKey];if(!l||!p.shipmentDate)return;(groups[p.shipmentDate]||(groups[p.shipmentDate]=[])).push({plan:p,lot:l});});var dates=Object.keys(groups).sort(),box=el('shipmentSchedule');if(!box)return;if(!dates.length){box.innerHTML='<div><strong>Embarques programados</strong><span>Nenhuma programação importada.</span></div>';return;}box.innerHTML='<div class="shipment-title"><strong>Embarques programados</strong><span>Toque em uma data para mostrar os currais.</span></div><div class="shipment-days">'+dates.map(function(d){var rows=groups[d],animals=sum(rows,function(x){return x.plan.quantity;}),pens=Array.from(new Set(rows.map(function(x){return x.lot.pen;}))).join(', ');return '<button type="button" data-shipment-date="'+d+'"><strong>'+dateBr(d)+'</strong><span>'+int(animals)+' animais</span><small>'+esc(pens)+'</small></button>';}).join('')+'</div>';}
function backup(){download('Recorrida_Confinamento_'+tsFile(new Date())+'.json',JSON.stringify({tipo:'recorrida_confinamento',exportadoEm:new Date().toISOString(),state:state},null,2));showToast('Cópia de segurança salva.');}
function mergeNotes(current,incoming){var map={};current.forEach(function(n){map[n.id]=n;});incoming.forEach(function(n){var ex=map[n.id];if(!ex)map[n.id]=n;else if(n.status==='closed'&&ex.status!=='closed')map[n.id]=n;});return Object.keys(map).map(function(k){return map[k];});}
function mergePlans(current,incoming){var map={};(current||[]).forEach(function(p){map[p.lotKey]=p;});(incoming||[]).forEach(function(p){var ex=map[p.lotKey];if(!ex||(p.importedAt||'')>(ex.importedAt||''))map[p.lotKey]=p;});return Object.keys(map).map(function(k){return map[k];});}
async function restore(file){
  try{
    var d=JSON.parse(await file.text()),s=d.state||d;
    if(!Array.isArray(s.lots)||!Array.isArray(s.notes))throw new Error();
    var incomingNewer=!!s.importedAt&&(!state.importedAt||s.importedAt>state.importedAt),mergedNotes=mergeNotes(state.notes,s.notes),addedNotes=mergedNotes.length-state.notes.length,mergedPlans=mergePlans(state.shipmentPlans,s.shipmentPlans);
    if(!confirm('Mesclar esta cópia com os dados deste aparelho?\n'+(incomingNewer?'A posição de lotes será atualizada para a mais recente (do arquivo importado).':'A posição de lotes deste aparelho já é a mais recente e será mantida.')+'\nAs anotações e as programações de abate dos dois arquivos serão combinadas, sem duplicar e sem apagar nada.'))return;
    state=Object.assign(defaults(),{version:state.version,lots:incomingNewer?s.lots:state.lots,reportDate:incomingNewer?s.reportDate:state.reportDate,importedAt:incomingNewer?s.importedAt:state.importedAt,notes:mergedNotes,penBlocks:state.penBlocks,shipmentPlans:mergedPlans});
    save();render();showToast('Cópia mesclada'+(addedNotes>0?': '+addedNotes+' anotação(ões) nova(s) incorporada(s).':'.'));
  }catch(e){showToast('Arquivo de cópia inválido.');}
}
function bind(){
  el('importBtn').onclick=function(){el('excelInput').click();};
  el('excelInput').onchange=async function(){var f=this.files&&this.files[0];if(!f)return;try{await importExcel(f);}catch(e){console.error(e);showToast(e.message||'Não foi possível importar a planilha.');}finally{this.value='';}};
  el('backupBtn').onclick=backup;
  el('restoreBtn').onclick=function(){el('restoreInput').click();};
  el('restoreInput').onchange=function(){var f=this.files&&this.files[0];if(f)restore(f);this.value='';};
  el('importShipmentBtn').onclick=function(){el('shipmentInput').click();};
  el('shipmentInput').onchange=importShipmentPlan;
  ['searchFilter','blockFilter','lineFilter','dietFilter','typeFilter','statusFilter','noteFilter','consMin','consMax','daysMin','daysMax','shipmentDateFilter'].forEach(function(id){el(id).addEventListener(id==='searchFilter'||id.indexOf('cons')===0||id.indexOf('days')===0?'input':'change',render);});
  el('clearFilters').onclick=clearFilters;
  document.querySelector('.quick-filters').onclick=function(e){var b=e.target.closest('button');if(!b)return;if(b.dataset.cons==='low'){el('consMin').value='';el('consMax').value='1.8';}if(b.dataset.cons==='high'){el('consMin').value='2.5';el('consMax').value='';}if(b.dataset.diet)el('dietFilter').value=b.dataset.diet;if(b.dataset.notes)el('noteFilter').value=b.dataset.notes;if(b.dataset.days){var r=b.dataset.days.split('-');el('daysMin').value=r[0];el('daysMax').value=r[1];}render();};
  el('summary').onclick=function(e){var b=e.target.closest('[data-kpi]');if(!b)return;if(b.dataset.kpi==='cons-low'){el('consMin').value='';el('consMax').value='1.8';el('dietFilter').value='TERMINACAO';}if(b.dataset.kpi==='diet-term'){el('dietFilter').value='TERMINACAO';}if(b.dataset.kpi==='notes-active'){el('noteFilter').value='active';}render();};
  el('penSelectAllFiltered').onclick=function(){filtered().forEach(function(l){penSelected.add(lotKey(l));});updatePenSelectionBar();};
  el('penClearSelection').onclick=function(){penSelected.clear();updatePenSelectionBar();};
  el('penSelectionChips').onclick=function(e){var b=e.target.closest('[data-pen-deselect]');if(!b)return;penSelected.delete(b.dataset.penDeselect);render();};
  el('penExportShipmentBtn').onclick=exportShipmentTemplate;
  el('penExportPrintBtn').onclick=exportPenPrint;
  el('penExportCsvBtn').onclick=exportPenCsv;
  el('shipmentSchedule').onclick=function(e){var b=e.target.closest('[data-shipment-date]');if(!b)return;el('shipmentDateFilter').value=b.dataset.shipmentDate;render();};
  el('penMap').onclick=function(e){if(e.target.closest('.pen-lot-select'))return;var row=e.target.closest('[data-pen-lot]');if(!row)return;selectedKey=row.dataset.penLot;renderDetail();el('drawer').hidden=false;};
  el('penMap').addEventListener('change',function(e){
    if(e.target.matches('[data-pen-block-name]')){var block=state.penBlocks.find(function(b){return b.id===e.target.dataset.penBlockName;});if(!block)return;block.name=String(e.target.value||'').trim()||('Bloco '+block.id);e.target.value=block.name;save();render();showToast('Nome do bloco atualizado.');return;}
    var cb=e.target.closest('[data-pen-select]');if(!cb)return;if(cb.checked)penSelected.add(cb.dataset.penSelect);else penSelected.delete(cb.dataset.penSelect);updatePenSelectionBar();
  });
  el('closeDrawer').onclick=function(){el('drawer').hidden=true;};
  el('drawer').onclick=function(e){if(e.target===this)this.hidden=true;};
  el('detailBody').onclick=function(e){var b=e.target.closest('[data-close-note]');if(b)conclude(b.dataset.closeNote);var d=e.target.closest('[data-delete-shipment]');if(d)deleteShipmentPlan(d.dataset.deleteShipment);};
  window.addEventListener('afterprint',function(){document.body.classList.remove('print-pens');});
  document.addEventListener('keydown',function(e){if(e.key==='Escape')el('drawer').hidden=true;});
}
document.addEventListener('DOMContentLoaded',function(){bind();render();if('serviceWorker' in navigator&&location.protocol.indexOf('http')===0)navigator.serviceWorker.register('./sw.js').catch(function(){});});
})();
