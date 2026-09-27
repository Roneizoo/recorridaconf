(function(){
'use strict';
var KEY='recorrida_confinamento_v1',state=load(),selectedKey='',CAPACITY_PEN=160,penSelected=new Set(),sanidadeMode=false,compactMode=false,lastSanidadeDate='';
function defaultPenBlocks(){return [{id:'01',name:'Bloco 01',lines:['A','B','C','D','E','F']},{id:'02',name:'Bloco 02',lines:['G','H','I','J','K']},{id:'03',name:'Bloco 03',lines:['L','M','N','O','P']}];}
function normalizedPenBlocks(saved){var standard=defaultPenBlocks();if(!Array.isArray(saved)||saved.length!==3)return standard;return standard.map(function(block,i){return {id:block.id,name:String((saved[i]||{}).name||block.name),lines:block.lines.slice()};});}
function defaultSanidadeCategories(){return [{code:'PNEUMONIA',label:'Pneumonia'},{code:'CASCO',label:'Casco'},{code:'REFUGO DE COCHO',label:'Refugo de Cocho'},{code:'LESAO',label:'Lesão'},{code:'ACIDOSE',label:'Acidose'},{code:'INFECCAO URINARIA',label:'Infecção Urinária'}];}
function defaultSanidadeMeds(){return [];}
function defaultSanidadeCauses(){return [{code:'DESCONHECIDO',label:'Desconhecido'},{code:'TIMPANISMO',label:'Timpanismo'},{code:'PNEUMONIA',label:'Pneumonia'},{code:'FRATURA',label:'Fratura'},{code:'POLIOENCEFALOMALACIA',label:'Polioencefalomalacia'},{code:'AUTOLISE',label:'Autólise'},{code:'TRISTEZA PARASITARIA',label:'Tristeza Parasitária'},{code:'INCONCLUSIVO',label:'Inconclusivo'},{code:'PERITONITE',label:'Peritonite'},{code:'PERICARDITE',label:'Pericardite'},{code:'CLOSTRIDIOSE',label:'Clostridiose'},{code:'ABOMASITE',label:'Abomasite'}];}
function normalizedCodedList(saved,base){var codes={};base.forEach(function(c){codes[c.code]=1;});var extra=[];(Array.isArray(saved)?saved:[]).forEach(function(c){var code=norm(c&&c.code),label=String((c&&c.label)||c||'').trim();if(!code||codes[code])return;codes[code]=1;extra.push({code:code,label:label||code});});return base.concat(extra);}
function normalizedSanidadeCategories(saved){return normalizedCodedList(saved,defaultSanidadeCategories());}
function normalizedSanidadeMeds(saved){return normalizedCodedList(saved,defaultSanidadeMeds());}
function normalizedSanidadeCauses(saved){return normalizedCodedList(saved,defaultSanidadeCauses());}
function defaults(){return {version:1,reportDate:'',importedAt:'',lots:[],notes:[],penBlocks:defaultPenBlocks(),shipmentPlans:[],sanidadeCategories:defaultSanidadeCategories(),sanidadeMeds:defaultSanidadeMeds(),sanidadeCauses:defaultSanidadeCauses(),sanidadeLog:[],sanidadeRounds:[]};}
function load(){try{var d=JSON.parse(localStorage.getItem(KEY));if(d&&Array.isArray(d.lots)&&Array.isArray(d.notes))return Object.assign(defaults(),d,{penBlocks:normalizedPenBlocks(d.penBlocks),shipmentPlans:Array.isArray(d.shipmentPlans)?d.shipmentPlans:[],sanidadeCategories:normalizedSanidadeCategories(d.sanidadeCategories),sanidadeMeds:normalizedSanidadeMeds(d.sanidadeMeds),sanidadeCauses:normalizedSanidadeCauses(d.sanidadeCauses),sanidadeLog:Array.isArray(d.sanidadeLog)?d.sanidadeLog:[],sanidadeRounds:Array.isArray(d.sanidadeRounds)?d.sanidadeRounds:[]});}catch(e){}return defaults();}
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
function ensureXlsxFull(){
  if(window.XLSX&&window.XLSX.version&&window.XLSX.read&&window.XLSX.__full)return Promise.resolve();
  return new Promise(function(resolve,reject){
    var s=document.createElement('script');s.src='xlsx.full.min.js';
    s.onload=function(){window.XLSX.__full=true;resolve();};
    s.onerror=function(){reject(new Error('Não foi possível carregar o leitor completo de planilha (xlsx.full.min.js).'));};
    document.body.appendChild(s);
  });
}
function loteCore(name){var m=String(name||'').toUpperCase().match(/LOTE\s*(\d+)\s*\/\s*(\d+)/);return m?'LOTE '+m[1]+'/'+m[2]:norm(name);}
function sheetRowsFrom(XLSXLib,sheet,markerText){
  if(!sheet)return [];
  var aoa=XLSXLib.utils.sheet_to_json(sheet,{header:1,defval:'',raw:true});
  var headerIdx=aoa.findIndex(function(r){return r.some(function(c){return norm(c)===norm(markerText);});});
  if(headerIdx<0)return [];
  var headers=aoa[headerIdx];
  return aoa.slice(headerIdx+1).map(function(r){var obj={};headers.forEach(function(h,i){if(h)obj[h]=r[i];});return obj;})
    .filter(function(o){return Object.keys(o).some(function(k){var v=o[k];return v!==''&&v!=null;});});
}
function findSheetName(wb,wanted){var target=norm(wanted);return wb.SheetNames.find(function(n){return norm(n)===target;})||wb.SheetNames.find(function(n){return norm(n).indexOf(target)>=0;});}
async function importSanidadeHistory(file){
  showToast('Lendo o histórico sanitário (pode levar alguns segundos)...');
  await ensureXlsxFull();
  var XLSXLib=window.XLSX;if(!XLSXLib||!XLSXLib.read)throw new Error('Leitor de planilha indisponível.');
  var wb;
  try{
    wb=XLSXLib.read(new Uint8Array(await file.arrayBuffer()),{type:'array',cellDates:true,cellFormula:false,bookVBA:false});
  }catch(readErr){
    var err=new Error('Não consegui ler esse arquivo diretamente (planilhas com tabelas dinâmicas complexas às vezes travam a leitura do .xlsb).');err.needsXlsxConversion=true;throw err;
  }
  var mortesName=findSheetName(wb,'BD Mortes'),medsName=findSheetName(wb,'BD Medicações')||findSheetName(wb,'BD Medicacoes');
  if(!mortesName&&!medsName)throw new Error('Não encontrei as abas "BD Mortes" ou "BD Medicações" nessa planilha.');
  var loteMap={};state.lots.forEach(function(l){loteMap[loteCore(l.name)]=l;});
  var existingIds={};state.sanidadeLog.forEach(function(o){existingIds[o.id]=true;});
  var newEntries=[],added=0,ignoredNoLote=0,ignoredDup=0;

  if(mortesName){
    sheetRowsFrom(XLSXLib,wb.Sheets[mortesName],'DATA DA MORTE').forEach(function(row){
      var get=fieldGetter(row),loteRaw=get('LOTE');if(!loteRaw)return;
      var l=loteMap[loteCore(loteRaw)];if(!l){ignoredNoLote++;return;}
      var dateIso=excelDateToIso(get('DATA DA MORTE'))||'';if(!dateIso){ignoredNoLote++;return;}
      var causeLabel=String(get('CAUSA DA MORTE')||'').trim()||'Desconhecido',causeCode=norm(causeLabel);
      if(!state.sanidadeCauses.some(function(c){return c.code===causeCode;}))state.sanidadeCauses.push({code:causeCode,label:causeLabel});
      var animalTag=String(get('NÚMERO DO ANIMAL')||get('NUMERO DO ANIMAL')||'').trim();
      var necRaw=norm(get('NECROPSIA ?')||get('NECROPSIA')||''),necropsia=necRaw==='SIM'?'sim':(necRaw==='NAO'?'nao':'');
      var destRaw=norm(get('DESTINO')||''),destino=destRaw==='ENTERRADO'?'enterrado':(destRaw==='CONSUMO'?'consumo':(destRaw?'outro':''));
      var pen=String(get('CURRAL DE ORIGEM')||l.pen).trim();
      var id='hist-obito-'+lotKey(l)+'-'+dateIso+'-'+norm(animalTag)+'-'+causeCode;
      if(existingIds[id]){ignoredDup++;return;}
      existingIds[id]=true;
      newEntries.push({id:id,lotKey:lotKey(l),lotName:l.name,pen:pen,line:l.line,date:dateIso,kind:'obito',categories:[],causeCode:causeCode,necropsia:necropsia,destino:destino,animalTag:animalTag,med:'',note:String(get('OBSERVAÇÃO')||get('OBSERVACAO')||'').trim(),createdAt:new Date().toISOString(),importedFrom:'historico'});
      added++;
    });
  }
  if(medsName){
    sheetRowsFrom(XLSXLib,wb.Sheets[medsName],'MEDICAMENTOS').forEach(function(row){
      var get=fieldGetter(row),loteRaw=get('LOTE');if(!loteRaw)return;
      var l=loteMap[loteCore(loteRaw)];if(!l){ignoredNoLote++;return;}
      var dateIso=excelDateToIso(get('DATA'))||'';if(!dateIso){ignoredNoLote++;return;}
      var symptomLabel=String(get('SINTOMAS')||'').trim(),symptomCode=symptomLabel?norm(symptomLabel):'';
      if(symptomCode&&!state.sanidadeCategories.some(function(c){return c.code===symptomCode;}))state.sanidadeCategories.push({code:symptomCode,label:symptomLabel});
      var medLabel=String(get('MEDICAMENTOS')||'').trim(),medCode=medLabel?norm(medLabel):'';
      if(medCode&&!state.sanidadeMeds.some(function(c){return c.code===medCode;}))state.sanidadeMeds.push({code:medCode,label:medLabel});
      var animalTag=String(get('NÚMERO DO ANIMAL')||get('NUMERO DO ANIMAL')||get('BRINCO DE MANEJO')||'').trim();
      var dose=get('Dose');var note=dose!==''&&dose!=null?'Dose: '+dose:'';
      var pen=String(get('CURRAL')||l.pen).trim();
      var id='hist-ocorr-'+lotKey(l)+'-'+dateIso+'-'+norm(animalTag)+'-'+symptomCode+'-'+medCode;
      if(existingIds[id]){ignoredDup++;return;}
      existingIds[id]=true;
      newEntries.push({id:id,lotKey:lotKey(l),lotName:l.name,pen:pen,line:l.line,date:dateIso,kind:'ocorrencia',categories:symptomCode?[symptomCode]:[],med:medCode,animalTag:animalTag,note:note,createdAt:new Date().toISOString(),importedFrom:'historico'});
      added++;
    });
  }
  state.sanidadeLog=state.sanidadeLog.concat(newEntries);
  save();render();renderDetail();
  showToast(added+' registro(s) importado(s) do histórico sanitário. '+ignoredNoLote+' ignorado(s) (lote não está mais ativo)'+(ignoredDup?' · '+ignoredDup+' já importado(s) antes':'')+'.');
}
function sum(rows,key){return rows.reduce(function(s,r){return s+Number(typeof key==='function'?key(r):r[key]||0);},0);}
function kpi(label,value,sub,cls,action){var tag=action?'button':'div';return '<'+tag+' class="kpi '+(cls||'')+(action?' clickable':'')+'"'+(action?' data-kpi="'+action+'" type="button"':'')+'><span>'+label+'</span><strong>'+value+'</strong><small>'+sub+(action?' · toque para filtrar':'')+'</small></'+tag+'>';}
function filtered(){var q=norm(el('searchFilter').value),line=el('lineFilter').value,diet=el('dietFilter').value,type=el('typeFilter').value,note=el('noteFilter').value,sanidadeF=el('sanidadeFilter').value,deathsF=el('deathsFilter').value,min=inputNumber(el('consMin').value),max=inputNumber(el('consMax').value),daysMin=inputNumber(el('daysMin').value),daysMax=inputNumber(el('daysMax').value),shipmentDate=el('shipmentDateFilter').value,sanidadeSet={};state.sanidadeLog.forEach(function(o){sanidadeSet[o.lotKey]=true;});return state.lots.filter(function(l){var notes=activeNotes(l).length,search=!q||norm(l.name+' '+l.pen+' '+l.line+' '+l.category+' '+l.proprietario).indexOf(q)>=0,shipment=shipmentFor(l),hasSanidade=!!sanidadeSet[lotKey(l)],hasDeaths=Number(l.deaths)>0;return search&&(!line||l.line===line)&&(!diet||norm(l.diet)===diet)&&(!type||l.type===type)&&(!note||(note==='active'?notes>0:notes===0))&&(!sanidadeF||(sanidadeF==='com'?hasSanidade:!hasSanidade))&&(!deathsF||(deathsF==='com'?hasDeaths:!hasDeaths))&&(min===null||l.pv>=min)&&(max===null||l.pv<=max)&&(daysMin===null||l.days>=daysMin)&&(daysMax===null||l.days<=daysMax)&&(!shipmentDate||(shipmentDate==='none'?!shipment:!!shipment&&shipment.shipmentDate===shipmentDate));});}
function fillFilters(){var line=el('lineFilter').value,diet=el('dietFilter').value,block=el('blockFilter').value,shipmentDate=el('shipmentDateFilter').value,lines=Array.from(new Set(state.lots.map(function(l){return l.line;}))).filter(Boolean).sort(),diets=Array.from(new Set(state.lots.map(function(l){return norm(l.diet);}))).filter(Boolean).sort(),shipDates=Array.from(new Set((state.shipmentPlans||[]).map(function(p){return p.shipmentDate;}))).filter(Boolean).sort();el('lineFilter').innerHTML='<option value="">Todas</option>'+lines.map(function(x){return '<option value="'+x+'">Linha '+x+'</option>';}).join('');el('dietFilter').innerHTML='<option value="">Todas</option>'+diets.map(function(x){return '<option value="'+esc(x)+'">'+esc(x)+'</option>';}).join('');el('blockFilter').innerHTML='<option value="">Todos</option>'+state.penBlocks.map(function(b){return '<option value="'+esc(b.id)+'">'+esc(b.name)+'</option>';}).join('');el('shipmentDateFilter').innerHTML='<option value="">Todas</option><option value="none">Sem programação</option>'+shipDates.map(function(d){return '<option value="'+d+'">'+dateBr(d)+'</option>';}).join('');el('lineFilter').value=line;el('dietFilter').value=diet;el('blockFilter').value=block;el('shipmentDateFilter').value=shipmentDate;}
function render(){fillFilters();var rows=filtered(),term=state.lots.filter(function(l){return norm(l.diet)==='TERMINACAO';}),termLow=term.filter(function(l){return l.pv<1.8;}),notes=state.notes.filter(function(n){return n.status==='active';}),lotsWithDeaths=state.lots.filter(function(l){return Number(l.deaths)>0;});el('positionLabel').textContent=state.reportDate?'Posição em '+dateBr(state.reportDate)+' · atualizado '+new Date(state.importedAt).toLocaleString('pt-BR'):'Nenhum relatório importado';
  var fullMap=buildPenMap(state.lots),allPens=[];
  state.penBlocks.forEach(function(block){block.lines.forEach(function(line){for(var n=1;n<=10;n++){var num=pad2(n),key=line+num;allPens.push(fullMap[key]||{line:line,number:num,lots:[],quantity:0,types:{own:0,boitel:0,partnership:0}});}});});
  var occupied=allPens.filter(function(p){return p.quantity>0;}),empty=allPens.length-occupied.length,animalsHoused=sum(occupied,'quantity'),internal=sum(occupied,function(p){return Math.max(0,CAPACITY_PEN-p.quantity);}),plannedVacant=occupied.filter(function(p){return p.lots.length&&p.lots.every(function(l){var s=shipmentFor(l);return s&&Number(s.quantity)>=Number(l.quantity);});});
  el('summary').innerHTML=kpi('Capacidade física',int(allPens.length*CAPACITY_PEN),allPens.length+' currais × '+CAPACITY_PEN)+kpi('Animais alojados',int(animalsHoused),occupied.length+' currais ocupados')+kpi('Capacidade operacional livre',int(empty*CAPACITY_PEN),empty+' currais vazios × '+CAPACITY_PEN,'gold')+kpi('Vagas após embarques',int((empty+plannedVacant.length)*CAPACITY_PEN),plannedVacant.length+' currais com saída total programada','green')+kpi('Espaço perdido',int(internal),'dentro de currais já ocupados','blue')+kpi('Consumo abaixo de 1,8% (terminação)',int(sum(termLow,'quantity')),'animais em terminação para observar','red','cons-low')+kpi('Mortes',int(sum(state.lots,'deaths')),lotsWithDeaths.length+' lote'+(lotsWithDeaths.length===1?'':'s')+' com registro','red','deaths')+kpi('Anotações ativas',int(notes.length),'acompanhamentos pendentes','blue','notes-active');
  el('resultCount').textContent=rows.length+' '+(rows.length===1?'curral':'currais');el('resultAnimals').textContent=int(sum(rows,'quantity'))+' animais';renderPenLegend();renderShipmentSchedule();renderSanidadeRecent();renderSanidadeReport();renderPenMap(rows);updatePenSelectionBar();}
function penNumber(l){var m=String(l.pen||'').match(/(\d{1,2})\s*$/);return m?m[1].padStart(2,'0'):'';}
function hasActiveFilters(){return !!(el('searchFilter').value.trim()||el('dietFilter').value||el('typeFilter').value||el('noteFilter').value||el('sanidadeFilter').value||el('deathsFilter').value||el('consMin').value.trim()||el('consMax').value.trim()||el('daysMin').value.trim()||el('daysMax').value.trim()||el('shipmentDateFilter').value);}
function buildPenMap(rows){var map={};rows.forEach(function(l){var num=penNumber(l);if(!num)return;var key=l.line+num;if(!map[key])map[key]={line:l.line,number:num,lots:[],quantity:0,types:{own:0,boitel:0,partnership:0}};map[key].lots.push(l);map[key].quantity+=Number(l.quantity)||0;map[key].types[l.type]=(map[key].types[l.type]||0)+(Number(l.quantity)||0);});return map;}
function penStatus(pen){if(!pen.quantity)return 'empty';if(pen.quantity>CAPACITY_PEN)return 'over';if(pen.quantity===CAPACITY_PEN)return 'full';return 'partial';}
function penStatusTitle(status,free){return status==='empty'?'Curral disponível':status==='over'?'Capacidade ultrapassada':status==='full'?'Curral lotado':free+' lugar'+(free===1?'':'es')+' perdido'+(free===1?'':'s');}
function dominantType(types){var own=types.own||0,other=(types.boitel||0)+(types.partnership||0);return own>=other?'own':'boitel';}
function penRiskDays(pen){if(!pen.lots.length)return null;return Math.min.apply(null,pen.lots.map(function(l){return Number(l.days)||0;}));}
function riskBand(days){if(days<=7)return 'risk-alto';if(days<=30)return 'risk-risco';if(days<=60)return 'risk-medio';return 'risk-baixo';}
function riskTitle(days){if(days<=7)return 'Alto risco · Ronda a pé ('+int(days)+'d)';if(days<=30)return 'Risco · Ronda a pé ('+int(days)+'d)';if(days<=60)return 'Médio risco · Crescimento ('+int(days)+'d)';return 'Baixo risco · Terminação ('+int(days)+'d)';}
function isPenChecked(code,date){return (state.sanidadeRounds||[]).some(function(r){return r.penCode===code&&r.date===date;});}
function togglePenChecked(code){var date=todayIso(),list=state.sanidadeRounds||(state.sanidadeRounds=[]),idx=list.findIndex(function(r){return r.penCode===code&&r.date===date;});if(idx>=0)list.splice(idx,1);else list.push({penCode:code,date:date});save();}
function renderPenLegend(){var box=el('penLegend');if(!box)return;box.innerHTML=sanidadeMode?('<span><i class="pen-dot empty"></i>Vazia</span><span><i class="pen-dot risk-alto"></i>Alto risco (0–7d) · ronda a pé</span><span><i class="pen-dot risk-risco"></i>Risco (8–30d) · ronda a pé</span><span><i class="pen-dot risk-medio"></i>Médio risco (31–60d) · crescimento</span><span><i class="pen-dot risk-baixo"></i>Baixo risco (>60d) · terminação</span>'):('<span><i class="pen-dot empty"></i>Vazia</span><span><i class="pen-dot own"></i>Próprio</span><span><i class="pen-dot boitel"></i>Boitel/Parceria</span><span><i class="pen-dot over"></i>Acima de 160</span>');}
function sanidadeObitosForLot(l){var lk=lotKey(l);return state.sanidadeLog.filter(function(o){return o.lotKey===lk&&(o.kind||'ocorrencia')==='obito';}).length;}
function penLotRow(l){var notes=activeNotes(l).length,key=lotKey(l),checked=penSelected.has(key),alert=l.pv<1.8||l.pv>2.5,shipment=shipmentFor(l),deaths=Number(l.deaths)||0,obitos=sanidadeObitosForLot(l);return '<div class="pen-lot-row'+(alert?' alert':'')+(notes?' has-note':'')+(shipment?' scheduled':'')+'" data-pen-lot="'+esc(key)+'">'+'<label class="pen-lot-select" title="Selecionar para exportar" onclick="event.stopPropagation()"><input type="checkbox" data-pen-select="'+esc(key)+'"'+(checked?' checked':'')+'></label>'+'<div class="pen-lot-main"><span class="pen-lot-name">'+esc(l.name)+' · '+int(l.quantity)+' · '+typeLabel(l.type)+'</span><span class="pen-lot-meta">'+esc(l.diet||'—')+' · '+decimal(l.pv,2)+'% PV · '+int(l.days)+'d conf.'+(notes?' · ● '+notes+' anot.':'')+(deaths>0?' · <span class="pen-lot-deaths">'+deaths+' morte'+(deaths===1?'':'s')+' (relatório)</span>':'')+(obitos>0?' · <span class="pen-lot-deaths">'+obitos+' óbito'+(obitos===1?'':'s')+' registrado'+(obitos===1?'':'s')+'</span>':'')+'</span></div>'+(shipment?'<span class="shipment-badge">Embarque '+dateBr(shipment.shipmentDate)+' · '+int(shipment.quantity)+' animais</span>':'')+'</div>';}
function penCard(pen){var status=penStatus(pen),riskDays=sanidadeMode&&status!=='empty'?penRiskDays(pen):null,cls=status==='empty'?'empty':(sanidadeMode?riskBand(riskDays):(status==='over'?'over':dominantType(pen.types))),hasShipment=pen.lots.some(function(l){return !!shipmentFor(l);}),free=Math.max(0,CAPACITY_PEN-pen.quantity),title=sanidadeMode&&status!=='empty'?riskTitle(riskDays):penStatusTitle(status,free),owners=Array.from(new Set(pen.lots.map(function(l){return String(ownerLabel(l)||'').trim();}).filter(Boolean))),ownerHtml=status!=='empty'&&owners.length?'<span class="pen-owner" title="Proprietário / categoria">'+esc(owners.join(' + '))+'</span>':'',code=pen.line+pen.number,roundChecked=status!=='empty'&&isPenChecked(code,todayIso());return '<article class="pen-card '+cls+(hasShipment?' scheduled':'')+'"><div class="pen-top"><span class="pen-code">'+esc(code)+'</span>'+(status!=='empty'?'<label class="pen-round-toggle" title="Ronda concluída hoje" onclick="event.stopPropagation()"><input type="checkbox" data-pen-round="'+esc(code)+'"'+(roundChecked?' checked':'')+'> ronda ok</label>':'')+'</div><div class="pen-status-line">'+(hasShipment?'Saída programada':esc(title))+'</div>'+ownerHtml+(status==='empty'?'<div class="pen-empty-mark">Livre</div>':'<div class="pen-qty"><strong>'+int(pen.quantity)+'</strong><span> de '+CAPACITY_PEN+' animais</span></div><div class="pen-meter"><i style="width:'+Math.min(100,pen.quantity/CAPACITY_PEN*100)+'%"></i></div><div class="pen-lots">'+pen.lots.map(penLotRow).join('')+'</div>')+'</article>';}
function penCompactCell(pen){
  var status=penStatus(pen),riskDays=sanidadeMode&&status!=='empty'?penRiskDays(pen):null,cls=status==='empty'?'empty':(sanidadeMode?riskBand(riskDays):(status==='over'?'over':dominantType(pen.types))),code=pen.line+pen.number,firstLot=pen.lots[0],roundChecked=status!=='empty'&&isPenChecked(code,todayIso());
  var title=status==='empty'?'Livre':(sanidadeMode?riskTitle(riskDays):penStatusTitle(status,Math.max(0,CAPACITY_PEN-pen.quantity)))+(pen.lots.length>1?' · '+pen.lots.length+' lotes':'');
  return '<div class="compact-cell '+cls+(firstLot?' clickable':'')+'"'+(firstLot?' data-pen-lot="'+esc(lotKey(firstLot))+'"':'')+' title="'+esc(title)+'">'+
    '<span class="compact-code">'+esc(pen.line+' '+pen.number)+'</span>'+
    (status!=='empty'?'<label class="compact-round" title="Ronda concluída hoje" onclick="event.stopPropagation()"><input type="checkbox" data-pen-round="'+esc(code)+'"'+(roundChecked?' checked':'')+'></label>':'')+
    (pen.lots.length>1?'<span class="compact-multi">'+pen.lots.length+'</span>':'')+
    '</div>';
}
function renderPenMapCompact(rows){
  var blockSel=el('blockFilter').value,lineSel=el('lineFilter').value,statusSel=el('statusFilter').value,filtersActive=hasActiveFilters(),map=buildPenMap(rows);
  var blocksHtml=state.penBlocks.filter(function(b){return !blockSel||b.id===blockSel;}).map(function(block){
    var lines=block.lines.filter(function(line){return !lineSel||line===lineSel;});
    var lineHtml=lines.map(function(line){
      var cells=[];
      for(var n=1;n<=10;n++){
        var num=pad2(n),key=line+num,pen=map[key]||{line:line,number:num,lots:[],quantity:0,types:{own:0,boitel:0,partnership:0}};
        var status=penStatus(pen),contentMatch=!filtersActive||pen.quantity>0,statusMatch=!statusSel||status===statusSel;
        cells.push(contentMatch&&statusMatch?penCompactCell(pen):'<div class="compact-cell compact-hidden"></div>');
      }
      return '<div class="compact-line"><span class="compact-line-label">'+line+'</span><div class="compact-row">'+cells.join('')+'</div></div>';
    }).join('');
    return '<div class="compact-block"><div class="compact-block-label">Setor '+esc(block.id)+' · '+esc(block.name)+'</div>'+lineHtml+'</div>';
  }).join('');
  el('penMap').innerHTML='<div class="compact-grid">'+(blocksHtml||'')+'</div>';
}
function renderPenMap(rows){
  if(compactMode)return renderPenMapCompact(rows);
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
function renderDetail(){var l=currentLot();if(!l){el('drawer').hidden=true;return;}el('detailTitle').textContent='Curral '+l.pen+' · '+l.name;var lk=lotKey(l),shipment=shipmentFor(l),related=state.notes.filter(function(n){return (n.scope==='lot'&&n.targetKey===lk)||(n.scope==='pen'&&n.targetKey===l.pen);}).sort(function(a,b){return b.createdAt.localeCompare(a.createdAt);});el('detailBody').innerHTML=(shipment?'<div class="shipment-detail"><div><strong>Embarque programado para '+dateBr(shipment.shipmentDate)+'</strong><span>'+int(shipment.quantity)+' animais'+(shipment.note?' - '+esc(shipment.note):'')+'</span></div><button type="button" class="shipment-delete" data-delete-shipment="'+esc(lk)+'" title="Excluir esta programacao de embarque" aria-label="Excluir programacao de embarque">x</button></div>':'')+'<div class="detail-hero"><div class="detail-box"><span>Animais</span><strong>'+int(l.quantity)+'</strong></div><div class="detail-box"><span>Dieta</span><strong>'+esc(l.diet)+'</strong></div><div class="detail-box"><span>Consumo %PV</span><strong>'+decimal(l.pv,2)+'%</strong></div><div class="detail-box"><span>Dias confinamento</span><strong>'+int(l.days)+'</strong></div></div><div class="detail-grid">'+detailItem('Proprietário',l.proprietario&&l.proprietario!=='-'?l.proprietario:'—')+detailItem('Categoria',l.category)+detailItem('Tipo',typeLabel(l.type))+detailItem('Raça',l.breed)+detailItem('Entrada',entryDateLabel(l))+detailItem('Peso entrada',decimal(l.entryWeight,1)+' kg')+detailItem('Peso estimado',decimal(l.estimatedWeight,1)+' kg')+detailItem('Peso de saída',decimal(l.exitWeight,1)+' kg')+detailItem('Saída estimada',dateBr(l.estimatedExit))+detailItem('GMD',decimal(l.gmd,2)+' kg/dia')+detailItem('Consumo MS',decimal(l.consumptionMS,2)+' kg/cab')+detailItem('Consumo MN',decimal(l.consumption,2)+' kg/cab')+detailItem('Dias de trato',int(l.treatmentDays))+detailItem('Mortes',int(l.deaths))+'</div><div class="notes-layout"><form class="note-form" id="noteForm"><h3>Nova anotação</h3><label>A anotação acompanha<select name="scope"><option value="lot">Este lote, mesmo se mudar de curral</option><option value="pen">Este curral</option></select></label><label>Anotação<textarea name="text" required placeholder="Registre o que foi observado e o que precisa ser acompanhado."></textarea></label><div class="note-actions"><button class="btn primary" type="submit">Salvar anotação</button><button class="btn secondary" type="button" id="closePenNotes">Concluir anotações do curral</button></div></form><section class="notes-panel"><h3>Histórico</h3>'+(related.length?related.map(noteCard).join(''):'<div class="empty-state">Nenhuma anotação registrada.</div>')+'</section></div>'+renderSanidadeSection(l);el('noteForm').onsubmit=addNote;el('closePenNotes').onclick=closePenNotes;el('sanidadeForm').onsubmit=addSanidadeOccurrence;el('sanidadeForm').querySelectorAll('input[name="kind"]').forEach(function(r){r.onchange=function(){applySanidadeKindVisibility(el('sanidadeForm'));};});}
function noteCard(n){return '<article class="note-card '+(n.status==='closed'?'closed':'')+'">'+(n.status==='active'?'<button data-close-note="'+n.id+'">Concluir</button>':'')+'<small>'+(n.scope==='lot'?'LOTE':'CURRAL')+' · '+new Date(n.createdAt).toLocaleString('pt-BR')+(n.closedAt?' · concluída '+new Date(n.closedAt).toLocaleString('pt-BR'):'')+'</small><p>'+esc(n.text)+'</p></article>';}
function addNote(e){e.preventDefault();var l=currentLot(),fd=new FormData(e.target),scope=fd.get('scope'),text=String(fd.get('text')||'').trim();if(!l||!text)return;state.notes.push({id:uid(),scope:scope,targetKey:scope==='lot'?lotKey(l):l.pen,lotName:l.name,pen:l.pen,text:text,status:'active',createdAt:new Date().toISOString(),closedAt:''});save();render();renderDetail();showToast('Anotação salva.');}
function conclude(id){var n=state.notes.find(function(x){return x.id===id;});if(!n)return;n.status='closed';n.closedAt=new Date().toISOString();save();render();renderDetail();showToast('Anotação concluída e mantida no histórico.');}
function closePenNotes(){var l=currentLot(),list=state.notes.filter(function(n){return n.status==='active'&&n.scope==='pen'&&n.targetKey===l.pen;});if(!list.length){showToast('Este curral não possui anotação ativa.');return;}if(!confirm('Concluir as '+list.length+' anotações ativas deste curral? Elas continuarão no histórico.'))return;list.forEach(function(n){n.status='closed';n.closedAt=new Date().toISOString();});save();render();renderDetail();showToast('Anotações do curral concluídas.');}
function todayIso(){var d=new Date();return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate());}
function sanidadeCategoryLabel(code){var found=state.sanidadeCategories.find(function(c){return c.code===code;});return found?found.label:code;}
function sanidadeForLot(l){var lk=lotKey(l);return state.sanidadeLog.filter(function(o){return o.lotKey===lk;}).sort(function(a,b){return (b.date+b.createdAt).localeCompare(a.date+a.createdAt);});}
function addSanidadeCategory(){var input=el('sanidadeNewCat');if(!input)return;var label=String(input.value||'').trim();if(!label){showToast('Digite o nome da categoria.');return;}var code=norm(label);if(state.sanidadeCategories.some(function(c){return c.code===code;})){showToast('Essa categoria já existe.');input.value='';return;}state.sanidadeCategories.push({code:code,label:label});save();renderDetail();showToast('Categoria "'+label+'" adicionada.');}
function captureSanidadeFormState(){var form=el('sanidadeForm');if(!form)return null;var fd=new FormData(form);return {cats:fd.getAll('cat'),med:fd.get('med')||'',note:fd.get('note')||'',date:fd.get('date')||'',kind:fd.get('kind')||'ocorrencia',animalTag:fd.get('animalTag')||'',cause:fd.get('cause')||'',necropsia:fd.get('necropsia')||'',destino:fd.get('destino')||''};}
function restoreSanidadeFormState(st){if(!st)return;var form=el('sanidadeForm');if(!form)return;form.querySelectorAll('input[name="cat"]').forEach(function(cb){cb.checked=st.cats.indexOf(cb.value)>=0;});var medSel=form.querySelector('select[name="med"]');if(medSel&&st.med)medSel.value=st.med;var noteInput=form.querySelector('input[name="note"]');if(noteInput)noteInput.value=st.note;var dateInput=form.querySelector('input[name="date"]');if(dateInput&&st.date)dateInput.value=st.date;var animalInput=form.querySelector('input[name="animalTag"]');if(animalInput&&st.animalTag)animalInput.value=st.animalTag;var causeSel=form.querySelector('select[name="cause"]');if(causeSel&&st.cause)causeSel.value=st.cause;var necSel=form.querySelector('select[name="necropsia"]');if(necSel&&st.necropsia)necSel.value=st.necropsia;var destSel=form.querySelector('select[name="destino"]');if(destSel&&st.destino)destSel.value=st.destino;if(st.kind==='obito'){var r=form.querySelector('input[name="kind"][value="obito"]');if(r)r.checked=true;}applySanidadeKindVisibility(form);}
function applySanidadeKindVisibility(form){var kind=(form.querySelector('input[name="kind"]:checked')||{}).value||'ocorrencia',oc=el('sanidadeKindOcorrencia'),ob=el('sanidadeKindObito');if(oc)oc.hidden=kind==='obito';if(ob)ob.hidden=kind!=='obito';}
function addSanidadeCategory(){var input=el('sanidadeNewCat');if(!input)return;var label=String(input.value||'').trim();if(!label){showToast('Digite o nome da categoria.');return;}var code=norm(label);if(state.sanidadeCategories.some(function(c){return c.code===code;})){showToast('Essa categoria já existe.');input.value='';return;}var st=captureSanidadeFormState();state.sanidadeCategories.push({code:code,label:label});save();renderDetail();restoreSanidadeFormState(st);var newCb=el('sanidadeForm').querySelector('input[name="cat"][value="'+CSS.escape(code)+'"]');if(newCb)newCb.checked=true;showToast('Categoria "'+label+'" adicionada.');}
function sanidadeMedLabel(code){if(!code)return '';var found=state.sanidadeMeds.find(function(c){return c.code===code;});return found?found.label:code;}
function sanidadeCauseLabel(code){if(!code)return '';var found=state.sanidadeCauses.find(function(c){return c.code===code;});return found?found.label:code;}
function addSanidadeMed(){var input=el('sanidadeNewMed');if(!input)return;var label=String(input.value||'').trim();if(!label){showToast('Digite o nome do medicamento/princípio ativo.');return;}var code=norm(label);if(state.sanidadeMeds.some(function(c){return c.code===code;})){showToast('Esse medicamento já existe.');input.value='';return;}var st=captureSanidadeFormState();state.sanidadeMeds.push({code:code,label:label});save();renderDetail();restoreSanidadeFormState(st);var medSel=el('sanidadeForm').querySelector('select[name="med"]');if(medSel)medSel.value=code;showToast('Medicamento "'+label+'" adicionado.');}
function addSanidadeCause(){var input=el('sanidadeNewCause');if(!input)return;var label=String(input.value||'').trim();if(!label){showToast('Digite o nome da causa.');return;}var code=norm(label);if(state.sanidadeCauses.some(function(c){return c.code===code;})){showToast('Essa causa já existe.');input.value='';return;}var st=captureSanidadeFormState();state.sanidadeCauses.push({code:code,label:label});save();renderDetail();restoreSanidadeFormState(st);var causeSel=el('sanidadeForm').querySelector('select[name="cause"]');if(causeSel)causeSel.value=code;showToast('Causa "'+label+'" adicionada.');}
function addSanidadeOccurrence(e){
  e.preventDefault();var l=currentLot();if(!l)return;var fd=new FormData(e.target);
  var kind=fd.get('kind')==='obito'?'obito':'ocorrencia',date=String(fd.get('date')||'').trim()||todayIso();lastSanidadeDate=date;
  var animalTag=String(fd.get('animalTag')||'').trim(),note=String(fd.get('note')||'').trim();
  if(kind==='obito'){
    var causeCode=norm(fd.get('cause')||'');
    if(!causeCode){showToast('Selecione a causa da morte.');return;}
    var necropsia=fd.get('necropsia')||'',destino=fd.get('destino')||'';
    state.sanidadeLog.push({id:uid(),lotKey:lotKey(l),lotName:l.name,pen:l.pen,line:l.line,date:date,kind:'obito',categories:[],causeCode:causeCode,necropsia:necropsia,destino:destino,animalTag:animalTag,med:'',note:note,createdAt:new Date().toISOString()});
    save();render();renderDetail();showToast('Óbito registrado ('+sanidadeCauseLabel(causeCode)+').');return;
  }
  var cats=fd.getAll('cat').map(norm).filter(Boolean);
  if(!cats.length){showToast('Marque ao menos uma categoria para esta ocorrência.');return;}
  var med=norm(fd.get('med')||'');
  state.sanidadeLog.push({id:uid(),lotKey:lotKey(l),lotName:l.name,pen:l.pen,line:l.line,date:date,kind:'ocorrencia',categories:cats,med:med,animalTag:animalTag,note:note,createdAt:new Date().toISOString()});
  save();render();renderDetail();showToast('Ocorrência registrada ('+cats.map(sanidadeCategoryLabel).join(', ')+').');
}
function deleteSanidadeOccurrence(id){var idx=state.sanidadeLog.findIndex(function(o){return o.id===id;});if(idx<0)return;if(!confirm('Excluir esta ocorrência de sanidade?'))return;state.sanidadeLog.splice(idx,1);save();render();renderDetail();showToast('Ocorrência excluída.');}
function sanidadeEntryCard(o){
  var kind=o.kind||'ocorrencia',animalTxt=o.animalTag?' · Animal '+esc(o.animalTag):'';
  if(kind==='obito'){
    var destinoLabel=o.destino?({enterrado:'Enterrado',consumo:'Consumo',outro:'Outro'}[o.destino]||o.destino):'';
    return '<div class="sanidade-entry obito"><div><small>'+dateBr(o.date)+' · ÓBITO'+animalTxt+'</small><div class="sanidade-entry-cats"><span>'+esc(sanidadeCauseLabel(o.causeCode))+'</span>'+(o.necropsia?'<span>Necropsia: '+(o.necropsia==='sim'?'Sim':'Não')+'</span>':'')+(destinoLabel?'<span>'+esc(destinoLabel)+'</span>':'')+'</div>'+(o.note?'<p class="sanidade-entry-note">'+esc(o.note)+'</p>':'')+'</div><button type="button" data-delete-sanidade="'+esc(o.id)+'" title="Excluir registro" aria-label="Excluir registro">×</button></div>';
  }
  return '<div class="sanidade-entry"><div><small>'+dateBr(o.date)+(o.med?' · '+esc(sanidadeMedLabel(o.med)):'')+animalTxt+'</small><div class="sanidade-entry-cats">'+o.categories.map(function(c){return '<span>'+esc(sanidadeCategoryLabel(c))+'</span>';}).join('')+'</div>'+(o.note?'<p class="sanidade-entry-note">'+esc(o.note)+'</p>':'')+'</div><button type="button" data-delete-sanidade="'+esc(o.id)+'" title="Excluir ocorrência" aria-label="Excluir ocorrência">×</button></div>';
}
function renderSanidadeSection(l){
  var entries=sanidadeForLot(l),counts={};entries.forEach(function(o){(o.categories||[]).forEach(function(c){counts[c]=(counts[c]||0)+1;});});
  var countsHtml=Object.keys(counts).length?Object.keys(counts).map(function(c){return '<span class="sanidade-count-chip">'+esc(sanidadeCategoryLabel(c))+' · '+counts[c]+'</span>';}).join(''):'';
  var obitosCount=entries.filter(function(o){return (o.kind||'ocorrencia')==='obito';}).length;
  if(obitosCount)countsHtml='<span class="sanidade-count-chip obito">Óbitos registrados · '+obitosCount+'</span>'+countsHtml;
  var deaths=Number(l.deaths)||0,deathsHtml=deaths>0?'<p class="sanidade-deaths-alert">'+deaths+' morte'+(deaths===1?'':'s')+' registrada'+(deaths===1?'':'s')+' para este lote no relatório do Bovino.OS.</p>':'';
  return '<div class="sanidade-section"><h3>Sanidade</h3>'+deathsHtml+'<p>Registre as ocorrências deste lote — pode marcar mais de uma categoria por animal, um lançamento por animal.</p>'+
    '<form id="sanidadeForm">'+
    '<div class="sanidade-kind-toggle"><label><input type="radio" name="kind" value="ocorrencia" checked> Ocorrência / medicação</label><label><input type="radio" name="kind" value="obito"> Óbito</label></div>'+
    '<div class="sanidade-kind-panel" id="sanidadeKindOcorrencia">'+
      '<div class="sanidade-checks">'+state.sanidadeCategories.map(function(c){return '<label class="check-chip"><input type="checkbox" name="cat" value="'+esc(c.code)+'"> '+esc(c.label)+'</label>';}).join('')+'</div>'+
      '<div class="sanidade-add-cat"><input id="sanidadeNewCat" placeholder="Nova categoria (ex.: Timpanismo)" maxlength="40"><button type="button" class="btn secondary" data-add-sanidade-cat>+ Categoria</button></div>'+
      '<div class="sanidade-med-row"><label>Medicamento/princípio ativo (opcional)<select name="med"><option value="">— não informado —</option>'+state.sanidadeMeds.map(function(c){return '<option value="'+esc(c.code)+'">'+esc(c.label)+'</option>';}).join('')+'</select></label></div>'+
      '<div class="sanidade-add-cat"><input id="sanidadeNewMed" placeholder="Novo medicamento (ex.: Oxitetraciclina)" maxlength="40"><button type="button" class="btn secondary" data-add-sanidade-med>+ Medicamento</button></div>'+
    '</div>'+
    '<div class="sanidade-kind-panel" id="sanidadeKindObito" hidden>'+
      '<div class="sanidade-med-row"><label>Causa da morte<select name="cause"><option value="">— selecione —</option>'+state.sanidadeCauses.map(function(c){return '<option value="'+esc(c.code)+'">'+esc(c.label)+'</option>';}).join('')+'</select></label></div>'+
      '<div class="sanidade-add-cat"><input id="sanidadeNewCause" placeholder="Nova causa (ex.: Enterotoxemia)" maxlength="40"><button type="button" class="btn secondary" data-add-sanidade-cause>+ Causa</button></div>'+
      '<div class="sanidade-obito-row"><label>Necropsia<select name="necropsia"><option value="">— não informado —</option><option value="sim">Sim</option><option value="nao">Não</option></select></label><label>Destino<select name="destino"><option value="">— não informado —</option><option value="enterrado">Enterrado</option><option value="consumo">Consumo</option><option value="outro">Outro</option></select></label></div>'+
    '</div>'+
    '<label class="sanidade-note-label">Nº do animal / brinco (opcional)<input type="text" name="animalTag" maxlength="30" placeholder="Ex.: 51774564"></label>'+
    '<label class="sanidade-note-label">Observação (opcional)<input type="text" name="note" maxlength="140" placeholder="Ex.: reincidente, já tratado semana passada"></label>'+
    '<div class="sanidade-form-actions"><label>Data<input type="date" name="date" value="'+esc(lastSanidadeDate||todayIso())+'"></label><button class="btn primary" type="submit">Registrar</button></div></form>'+
    (countsHtml?'<div class="sanidade-summary">'+countsHtml+'</div>':'')+
    '<div class="sanidade-history">'+(entries.length?entries.map(sanidadeEntryCard).join(''):'<div class="empty-state">Nenhuma ocorrência registrada para este lote.</div>')+'</div></div>';
}
function renderSanidadeRecent(){var box=el('sanidadeRecent');if(!box)return;var recent=state.sanidadeLog.slice().sort(function(a,b){return b.createdAt.localeCompare(a.createdAt);}).slice(0,8);if(!recent.length){box.innerHTML='';return;}box.innerHTML='<div class="shipment-title"><strong>Últimas ocorrências de sanidade</strong><span>Toque para abrir o lote.</span></div><div class="shipment-days">'+recent.map(function(o){var kind=o.kind||'ocorrencia',label=kind==='obito'?('Óbito · '+sanidadeCauseLabel(o.causeCode)):esc(o.categories.map(sanidadeCategoryLabel).join(', '));return '<button type="button" data-sanidade-recent="'+esc(o.lotKey)+'"><strong>'+esc(o.pen)+' · '+esc(o.lotName)+'</strong><span>'+label+'</span><small>'+dateBr(o.date)+'</small></button>';}).join('')+'</div>';}
function isNoAnimalId(tag){var n=norm(tag);if(!n)return true;var markers=['SIN BOTON','S N','SN','SEM BRINCO','SEM NUMERO','SEM NUMERO DE ANIMAL','DESCONHECIDO','SEM ID','SEM IDENTIFICACAO'];return markers.indexOf(n)>=0;}
function sanidadeCaseKey(o){var real=o.animalTag&&!isNoAnimalId(o.animalTag);return real?(o.lotKey+'|'+norm(o.animalTag)):null;}
function sanidadeDistinctCaseCount(entries){var seen={},cases=0;entries.forEach(function(o){var key=sanidadeCaseKey(o);if(key){if(!seen[key]){seen[key]=true;cases++;}}else{cases++;}});return cases;}
function sanidadeReportGroup(entries,keyFn,labelFn){
  var map={};
  entries.forEach(function(o){
    var caseKey=sanidadeCaseKey(o);
    (keyFn(o)||[]).forEach(function(k){
      if(!k)return;
      if(!map[k])map[k]={label:labelFn(k),count:0,cases:0,seen:{},pens:{},types:{own:0,boitel:0,partnership:0}};
      map[k].count++;
      if(caseKey){if(!map[k].seen[caseKey]){map[k].seen[caseKey]=true;map[k].cases++;}}else{map[k].cases++;}
      map[k].pens[o.pen]=(map[k].pens[o.pen]||0)+1;
      var l=state.lots.find(function(x){return lotKey(x)===o.lotKey;});
      if(l)map[k].types[l.type]=(map[k].types[l.type]||0)+1;
    });
  });
  return Object.keys(map).map(function(k){return map[k];}).sort(function(a,b){return b.cases-a.cases;});
}
function sanidadeReportRowHtml(g,total){
  var pens=Object.keys(g.pens).sort(function(a,b){return g.pens[b]-g.pens[a];}).slice(0,4).map(function(p){return p+' ('+g.pens[p]+')';}).join(', ');
  var typesParts=[];if(g.types.own)typesParts.push('Próprio: '+g.types.own);if(g.types.boitel)typesParts.push('Boitel: '+g.types.boitel);if(g.types.partnership)typesParts.push('Parceria: '+g.types.partnership);
  var countNote=g.count!==g.cases?' · '+g.count+' lançamento'+(g.count===1?'':'s')+' no total (mesmo animal tratado mais de uma vez)':'';
  return '<div class="sanidade-report-row"><strong>'+esc(g.label)+'</strong><span>'+g.cases+' caso'+(g.cases===1?'':'s')+' ('+decimal(total?g.cases/total*100:0,1)+'%)</span><small>Currais: '+esc(pens||'—')+countNote+'</small>'+(typesParts.length?'<small>'+esc(typesParts.join(' · '))+'</small>':'')+'</div>';
}
function renderSanidadeReport(){
  var box=el('sanidadeReport');if(!box)return;
  var log=state.sanidadeLog,obitos=log.filter(function(o){return (o.kind||'ocorrencia')==='obito';}),ocorr=log.filter(function(o){return (o.kind||'ocorrencia')!=='obito';});
  if(!log.length){box.innerHTML='<div class="empty-state">Nenhum registro de sanidade ainda — o relatório aparece aqui conforme forem lançadas ocorrências e óbitos.</div>';return;}
  var obitoGroups=sanidadeReportGroup(obitos,function(o){return [o.causeCode];},sanidadeCauseLabel);
  var ocorrGroups=sanidadeReportGroup(ocorr,function(o){return o.categories;},sanidadeCategoryLabel);
  var obitoCases=sanidadeDistinctCaseCount(obitos),ocorrCases=sanidadeDistinctCaseCount(ocorr);
  var ocorrNote=ocorrCases!==ocorr.length?' · '+ocorr.length+' lançamentos no total':'';
  box.innerHTML='<h3>Causas de óbito ('+obitoCases+' caso'+(obitoCases===1?'':'s')+')</h3>'+(obitoGroups.length?obitoGroups.map(function(g){return sanidadeReportRowHtml(g,obitoCases);}).join(''):'<div class="empty-state">Nenhum óbito registrado.</div>')+
    '<h3>Ocorrências / sintomas ('+ocorrCases+' caso'+(ocorrCases===1?'':'s')+esc(ocorrNote)+')</h3><p class="sanidade-report-hint">Um mesmo animal tratado várias vezes conta como 1 caso — a contagem de lançamentos aparece à parte.</p>'+(ocorrGroups.length?ocorrGroups.map(function(g){return sanidadeReportRowHtml(g,ocorrCases);}).join(''):'<div class="empty-state">Nenhuma ocorrência registrada.</div>');
}
function exportSanidadeCsv(){
  var rows=state.sanidadeLog.slice().sort(function(a,b){return (a.date+a.createdAt).localeCompare(b.date+b.createdAt);});
  if(!rows.length){showToast('Nenhuma ocorrência de sanidade registrada ainda.');return;}
  var head=['Data','Tipo','Linha','Curral','Lote','Nº Animal','Categoria/Causa','Medicamento','Necropsia','Destino','Observação'],lines=[];
  var necLabel={sim:'Sim',nao:'Não'},destLabel={enterrado:'Enterrado',consumo:'Consumo',outro:'Outro'};
  rows.forEach(function(o){
    var kind=o.kind||'ocorrencia';
    if(kind==='obito'){
      lines.push([dateBr(o.date),'Óbito',o.line,o.pen,o.lotName,o.animalTag||'',sanidadeCauseLabel(o.causeCode),'',necLabel[o.necropsia]||'',destLabel[o.destino]||'',o.note||''].map(csvField).join(';'));
    }else{
      (o.categories&&o.categories.length?o.categories:['']).forEach(function(code){
        lines.push([dateBr(o.date),'Ocorrência',o.line,o.pen,o.lotName,o.animalTag||'',sanidadeCategoryLabel(code),sanidadeMedLabel(o.med),'','',o.note||''].map(csvField).join(';'));
      });
    }
  });
  download('Sanidade_Ocorrencias_'+Date.now()+'.csv','\uFEFF'+[head.join(';')].concat(lines).join('\r\n'),'text/csv');
  showToast(lines.length+' registro(s) exportado(s) em CSV.');
}
function exportPenRound(){var lots=penExportRows();if(!lots.length){showToast('Selecione ao menos um curral/lote para gerar a lista de ronda.');return;}var groups={'risk-alto':[],'risk-risco':[],'risk-medio':[],'risk-baixo':[]},labels={'risk-alto':'ALTO RISCO · RONDA A PÉ (0–7 DIAS)','risk-risco':'RISCO · RONDA A PÉ (8–30 DIAS)','risk-medio':'MÉDIO RISCO · CRESCIMENTO (31–60 DIAS)','risk-baixo':'BAIXO RISCO · TERMINAÇÃO (>60 DIAS)'},seenPens={};lots.forEach(function(l){var band=riskBand(Number(l.days)||0),pk=l.line+l.pen+'|'+band;if(seenPens[pk])return;seenPens[pk]=true;groups[band].push(l);});var order=['risk-alto','risk-risco','risk-medio','risk-baixo'],body=order.filter(function(b){return groups[b].length;}).map(function(b){var rows=groups[b].sort(function(a,c){return (a.line+a.pen).localeCompare(c.line+c.pen,undefined,{numeric:true});});return '<h2>'+labels[b]+'</h2><table><tbody>'+rows.map(function(l){return '<tr><td class="round-pen">'+esc(l.pen)+'</td><td>'+esc(l.name)+'</td></tr>';}).join('')+'</tbody></table>';}).join('');el('penPrintArea').innerHTML='<h1>Ronda Sanitária — '+dateBr(todayIso())+'</h1><p>Gerado em '+new Date().toLocaleString('pt-BR')+' · '+lots.length+' curral'+(lots.length===1?'':'is')+' selecionado'+(lots.length===1?'':'s')+'</p>'+body;document.body.classList.add('print-pens','print-round');window.print();}
function exportPenGridPrint(){
  var map=buildPenMap(state.lots),rowsHtml=state.penBlocks.map(function(block){
    return block.lines.map(function(line){
      var cells=[];
      for(var n=1;n<=10;n++){
        var num=pad2(n),key=line+num,pen=map[key]||{lots:[],quantity:0};
        var status=penStatus(pen),cls=status==='empty'?'pg-empty':'pg-'+riskBand(penRiskDays(pen));
        cells.push('<td class="'+cls+'">'+line+'-'+n+'</td>');
      }
      return '<tr><th>'+line+'</th>'+cells.join('')+'</tr>';
    }).join('');
  }).join('');
  var legend='<table class="print-grid-legend"><thead><tr><th>Dias</th><th>Grau de risco</th><th>Tipo</th></tr></thead><tbody>'+
    '<tr><td class="pg-risk-alto">0–7</td><td>Alto risco</td><td>Ronda a pé</td></tr>'+
    '<tr><td class="pg-risk-risco">8–30</td><td>Risco</td><td>Ronda a pé</td></tr>'+
    '<tr><td class="pg-risk-medio">31–60</td><td>Médio risco</td><td>Crescimento</td></tr>'+
    '<tr><td class="pg-risk-baixo">&gt;60</td><td>Baixo risco</td><td>Terminação</td></tr>'+
    '<tr><td class="pg-empty">-</td><td colspan="2">Curral vazio</td></tr></tbody></table>';
  el('penPrintArea').innerHTML='<h1>Mapa de Risco Sanitário — '+dateBr(todayIso())+'</h1>'+
    '<div class="print-grid-wrap"><table class="print-grid-table"><tbody>'+rowsHtml+'</tbody></table>'+legend+'</div>';
  document.body.classList.add('print-pens','print-grid');window.print();
}
function clearFilters(){['searchFilter','blockFilter','lineFilter','dietFilter','typeFilter','statusFilter','noteFilter','riskFilter','sanidadeFilter','deathsFilter','consMin','consMax','daysMin','daysMax','shipmentDateFilter'].forEach(function(id){el(id).value='';});render();}
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
function mergeSanidadeLog(current,incoming){var map={};(current||[]).forEach(function(o){map[o.id]=o;});(incoming||[]).forEach(function(o){if(!map[o.id])map[o.id]=o;});return Object.keys(map).map(function(k){return map[k];});}
function mergeCodedList(current,incoming,base){var codes={};(current||[]).forEach(function(c){codes[c.code]=c;});(incoming||[]).forEach(function(c){if(!codes[c.code])codes[c.code]=c;});var baseCodes=base.map(function(c){return c.code;}),all=Object.keys(codes),extra=all.filter(function(c){return baseCodes.indexOf(c)<0;});return baseCodes.filter(function(c){return codes[c];}).map(function(c){return codes[c];}).concat(extra.map(function(c){return codes[c];}));}
function mergeSanidadeCategories(current,incoming){return mergeCodedList(current,incoming,defaultSanidadeCategories());}
function mergeSanidadeMeds(current,incoming){return mergeCodedList(current,incoming,defaultSanidadeMeds());}
function mergeSanidadeCauses(current,incoming){return mergeCodedList(current,incoming,defaultSanidadeCauses());}
function mergeSanidadeRounds(current,incoming){var seen={};(current||[]).forEach(function(r){seen[r.penCode+'|'+r.date]=r;});(incoming||[]).forEach(function(r){var k=r.penCode+'|'+r.date;if(!seen[k])seen[k]=r;});return Object.keys(seen).map(function(k){return seen[k];});}
async function restore(file){
  try{
    var d=JSON.parse(await file.text()),s=d.state||d;
    if(!Array.isArray(s.lots)||!Array.isArray(s.notes))throw new Error();
    var incomingNewer=!!s.importedAt&&(!state.importedAt||s.importedAt>state.importedAt),mergedNotes=mergeNotes(state.notes,s.notes),addedNotes=mergedNotes.length-state.notes.length,mergedPlans=mergePlans(state.shipmentPlans,s.shipmentPlans),mergedSanidadeLog=mergeSanidadeLog(state.sanidadeLog,s.sanidadeLog),addedSanidade=mergedSanidadeLog.length-state.sanidadeLog.length,mergedSanidadeCategories=mergeSanidadeCategories(state.sanidadeCategories,s.sanidadeCategories),mergedSanidadeMeds=mergeSanidadeMeds(state.sanidadeMeds,s.sanidadeMeds),mergedSanidadeCauses=mergeSanidadeCauses(state.sanidadeCauses,s.sanidadeCauses),mergedSanidadeRounds=mergeSanidadeRounds(state.sanidadeRounds,s.sanidadeRounds);
    if(!confirm('Mesclar esta cópia com os dados deste aparelho?\n'+(incomingNewer?'A posição de lotes será atualizada para a mais recente (do arquivo importado).':'A posição de lotes deste aparelho já é a mais recente e será mantida.')+'\nAs anotações, as programações de abate e a sanidade dos dois arquivos serão combinadas, sem duplicar e sem apagar nada.'))return;
    state=Object.assign(defaults(),{version:state.version,lots:incomingNewer?s.lots:state.lots,reportDate:incomingNewer?s.reportDate:state.reportDate,importedAt:incomingNewer?s.importedAt:state.importedAt,notes:mergedNotes,penBlocks:state.penBlocks,shipmentPlans:mergedPlans,sanidadeLog:mergedSanidadeLog,sanidadeCategories:mergedSanidadeCategories,sanidadeMeds:mergedSanidadeMeds,sanidadeCauses:mergedSanidadeCauses,sanidadeRounds:mergedSanidadeRounds});
    save();render();showToast('Cópia mesclada'+(addedNotes>0?': '+addedNotes+' anotação(ões) nova(s)':'')+(addedSanidade>0?(addedNotes>0?', ':': ')+addedSanidade+' ocorrência(s) de sanidade nova(s)':'')+'.');
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
  el('importHistoryBtn').onclick=function(){el('historyInput').click();};
  el('historyInput').onchange=async function(){var f=this.files&&this.files[0];if(!f)return;try{await importSanidadeHistory(f);}catch(e){console.error(e);if(e.needsXlsxConversion){el('xlsbHelp').hidden=false;}else{showToast(e.message||'Não foi possível importar o histórico sanitário.');}}finally{this.value='';}};
  ['searchFilter','blockFilter','lineFilter','dietFilter','typeFilter','statusFilter','noteFilter','sanidadeFilter','consMin','consMax','daysMin','daysMax','shipmentDateFilter'].forEach(function(id){el(id).addEventListener(id==='searchFilter'||id.indexOf('cons')===0||id.indexOf('days')===0?'input':'change',render);});
  el('riskFilter').onchange=function(){var v=this.value,ranges={alto:[0,7],risco:[8,30],medio:[31,60],baixo:[61,'']};if(!v){el('daysMin').value='';el('daysMax').value='';}else{el('daysMin').value=ranges[v][0];el('daysMax').value=ranges[v][1];}render();};
  el('clearFilters').onclick=clearFilters;
  el('toggleFiltersBtn').onclick=function(){var body=el('filterBody'),willShow=body.hidden;body.hidden=!willShow;this.textContent=willShow?'Ocultar filtros':'Mostrar filtros';this.classList.toggle('primary',!willShow);this.classList.toggle('secondary',willShow);};
  el('toggleRecentBtn').onclick=function(){var box=el('sanidadeRecent'),willShow=box.hidden;box.hidden=!willShow;this.textContent=willShow?'Ocultar últimas ocorrências':'Mostrar últimas ocorrências';};
  el('toggleReportBtn').onclick=function(){var box=el('sanidadeReport'),willShow=box.hidden;box.hidden=!willShow;this.textContent=willShow?'Ocultar relatório de causas':'Mostrar relatório de causas';};
  el('sanidadeModeBtn').onclick=function(){sanidadeMode=!sanidadeMode;this.classList.toggle('toggle-active',sanidadeMode);renderPenLegend();renderPenMap(filtered());};
  el('compactModeBtn').onclick=function(){compactMode=!compactMode;this.classList.toggle('toggle-active',compactMode);renderPenMap(filtered());};
  el('printGridBtn').onclick=exportPenGridPrint;
  el('sanidadeExportBtn').onclick=exportSanidadeCsv;
  el('penExportRoundBtn').onclick=exportPenRound;
  el('sanidadeRecent').onclick=function(e){var b=e.target.closest('[data-sanidade-recent]');if(!b)return;selectedKey=b.dataset.sanidadeRecent;renderDetail();el('drawer').hidden=false;};
  document.querySelector('.quick-filters').onclick=function(e){var b=e.target.closest('button');if(!b)return;if(b.dataset.cons==='low'){el('consMin').value='';el('consMax').value='1.8';}if(b.dataset.cons==='high'){el('consMin').value='2.5';el('consMax').value='';}if(b.dataset.diet)el('dietFilter').value=b.dataset.diet;if(b.dataset.notes)el('noteFilter').value=b.dataset.notes;if(b.dataset.days){var r=b.dataset.days.split('-');el('daysMin').value=r[0];el('daysMax').value=r[1];}render();};
  el('summary').onclick=function(e){var b=e.target.closest('[data-kpi]');if(!b)return;if(b.dataset.kpi==='cons-low'){el('consMin').value='';el('consMax').value='1.8';el('dietFilter').value='TERMINACAO';}if(b.dataset.kpi==='diet-term'){el('dietFilter').value='TERMINACAO';}if(b.dataset.kpi==='notes-active'){el('noteFilter').value='active';}if(b.dataset.kpi==='deaths'){el('deathsFilter').value='com';}el('filterBody').hidden=false;el('toggleFiltersBtn').textContent='Ocultar filtros';el('toggleFiltersBtn').classList.remove('secondary');el('toggleFiltersBtn').classList.add('primary');render();};
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
    var rd=e.target.closest('[data-pen-round]');if(rd){togglePenChecked(rd.dataset.penRound);render();return;}
    var cb=e.target.closest('[data-pen-select]');if(!cb)return;if(cb.checked)penSelected.add(cb.dataset.penSelect);else penSelected.delete(cb.dataset.penSelect);updatePenSelectionBar();
  });
  el('closeDrawer').onclick=function(){el('drawer').hidden=true;};
  el('closeXlsbHelp').onclick=function(){el('xlsbHelp').hidden=true;};
  el('closeXlsbHelp2').onclick=function(){el('xlsbHelp').hidden=true;};
  el('xlsbHelp').onclick=function(e){if(e.target===this)this.hidden=true;};
  el('copyXlsbHelp').onclick=function(){
    var text='Esse arquivo .xlsb não abre direto no Recorrida — é rápido resolver:\n1. Abra o arquivo no Excel, no computador.\n2. Clique em Arquivo → Salvar como.\n3. Em "Tipo", escolha Pasta de Trabalho do Excel (*.xlsx) e salve.\n4. No Recorrida, clique em "Importar histórico sanitário" de novo e escolha esse novo arquivo .xlsx.';
    if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(text).then(function(){showToast('Instruções copiadas.');}).catch(function(){showToast('Não foi possível copiar. Copie manualmente o texto na tela.');});}
    else{showToast('Não foi possível copiar. Copie manualmente o texto na tela.');}
  };
  el('drawer').onclick=function(e){if(e.target===this)this.hidden=true;};
  el('detailBody').onclick=function(e){var b=e.target.closest('[data-close-note]');if(b)conclude(b.dataset.closeNote);var d=e.target.closest('[data-delete-shipment]');if(d)deleteShipmentPlan(d.dataset.deleteShipment);var s=e.target.closest('[data-delete-sanidade]');if(s)deleteSanidadeOccurrence(s.dataset.deleteSanidade);var ac=e.target.closest('[data-add-sanidade-cat]');if(ac)addSanidadeCategory();var am=e.target.closest('[data-add-sanidade-med]');if(am)addSanidadeMed();var acs=e.target.closest('[data-add-sanidade-cause]');if(acs)addSanidadeCause();};
  window.addEventListener('afterprint',function(){document.body.classList.remove('print-pens');});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'){el('drawer').hidden=true;el('xlsbHelp').hidden=true;}});
}
document.addEventListener('DOMContentLoaded',function(){bind();render();if('serviceWorker' in navigator&&location.protocol.indexOf('http')===0)navigator.serviceWorker.register('./sw.js').catch(function(){});});
})();
