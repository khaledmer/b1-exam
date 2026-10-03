// Builds the per-student PDF report: real text, real tables, automatic page breaks (no screenshots).
const BAD=/[^\u0020-\u007E\u00A0-\u00FF\u2018\u2019\u201C\u201D\u2013\u2014\u2026]/; // characters the built-in PDF font cannot draw
const safe=t=>String(t??'').replace(new RegExp(BAD.source,'g'),'?');
const pts=n=>String(Math.round(n*10)/10);

// Names in other scripts (e.g. Arabic) are drawn by the browser onto a canvas and inserted as an image.
function textImage(doc,text,x,y){
 const px=64,c=document.createElement('canvas'),g=c.getContext('2d');
 g.font=`${px}px sans-serif`;c.width=Math.ceil(g.measureText(text).width)+8;c.height=Math.ceil(px*1.5);
 g.font=`${px}px sans-serif`;g.textBaseline='middle';g.fillStyle='#101b3b';g.fillText(text,4,c.height/2);
 const h=6;doc.addImage(c.toDataURL('image/png'),'PNG',x,y-4.4,Math.min(c.width/c.height*h,150),h);
}

export function buildReport(jsPDF,autoTable,exam,s){
 const doc=new jsPDF({unit:'mm',format:'a4'}),M=14,INK=[16,27,59];
 doc.setFont('helvetica','bold');doc.setFontSize(18);doc.setTextColor(...INK);doc.text(safe(exam.title),M,20);
 doc.setFont('helvetica','normal');doc.setFontSize(10);doc.setTextColor(90,90,90);
 doc.text('Official Exam Report - '+new Date(s.submittedAt).toLocaleDateString(),M,26);

 doc.setFontSize(10.5);
 const put=(label,value,y,isName)=>{doc.setFont('helvetica','bold');doc.setTextColor(...INK);doc.text(label,M,y);doc.setFont('helvetica','normal');
  if(isName&&BAD.test(value)&&typeof document!=='undefined')textImage(doc,value,M+24,y);else doc.text(safe(value),M+24,y)};
 put('Student:',s.name||'-',36,true);
 put('Email:',s.email,42);
 put('Submitted:',new Date(s.submittedAt).toLocaleString()+(s.auto?' (auto-submitted)':''),48);

 autoTable(doc,{startY:54,head:[['Total score','Grammar','Reading']],body:[[`${pts(s.total)} / 100`,`${pts(s.grammar)} / 70`,`${pts(s.reading)} / 30`]],
  theme:'grid',tableWidth:110,margin:{left:M},styles:{halign:'center',fontSize:11,cellPadding:3,textColor:INK,lineColor:[200,205,220],lineWidth:0.1},
  headStyles:{fillColor:INK,textColor:255,fontSize:9}});

 const notes=exam.sections.some(x=>x.questions.some(q=>q.explanation));
 const head=['#','Question','Student answer','Correct answer','Points',...(notes?['Notes']:[])];
 const body=[];let n=0;
 for(const sec of exam.sections){
  const sc=sec.id==='grammar'?s.grammar:s.reading;
  body.push([{content:`${safe(sec.title)}  (${pts(sc)} / ${sec.totalPoints})`,colSpan:head.length,styles:{fillColor:[226,230,246],fontStyle:'bold'}}]);
  for(const q of sec.questions){n++;
   const a=s.answers[q.id],ok=a===q.correctAnswer,col=ok?[220,245,228]:[252,226,226];
   body.push([String(n),safe(q.text),
    {content:a==null?'No answer':`${'ABCD'[a]}) ${safe(q.options[a])}`,styles:{fillColor:col}},
    `${'ABCD'[q.correctAnswer]}) ${safe(q.options[q.correctAnswer])}`,
    {content:`${pts(ok?q.points:0)} / ${pts(q.points)}`,styles:{fillColor:col,halign:'center'}},
    ...(notes?[safe(q.explanation||'')]:[])]);
  }
 }
 autoTable(doc,{startY:doc.lastAutoTable.finalY+8,head:[head],body,theme:'grid',margin:{left:M,right:M},rowPageBreak:'avoid',
  styles:{fontSize:8.5,cellPadding:1.8,valign:'top',lineColor:[200,205,220],lineWidth:0.1,textColor:INK},headStyles:{fillColor:INK,textColor:255},
  columnStyles:notes?{0:{cellWidth:8},1:{cellWidth:52},2:{cellWidth:34},3:{cellWidth:34},4:{cellWidth:16,halign:'center'}}
                    :{0:{cellWidth:8},1:{cellWidth:68},2:{cellWidth:44},3:{cellWidth:44},4:{cellWidth:18,halign:'center'}}});
 const pages=doc.getNumberOfPages();
 for(let i=1;i<=pages;i++){doc.setPage(i);doc.setFontSize(8);doc.setTextColor(120,120,120);doc.text(`Page ${i} of ${pages}`,210-M,290,{align:'right'});doc.text(safe(exam.title),M,290)}
 return doc;
}
