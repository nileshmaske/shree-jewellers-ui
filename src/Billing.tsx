import {useCallback,useEffect,useMemo,useState,type FormEvent} from 'react';
import {Plus,Trash2,RefreshCw,ReceiptIndianRupee,Search,FileText,ChevronLeft,ChevronRight,ScanBarcode,Printer,Mail,MessageSquare} from 'lucide-react';
import {inventoryRequest,type Product} from './Inventory';

type BillItem={product:Product;quantity:number};
type Invoice={id:number;invoiceNumber:string;customerName:string;customerPhone:string|null;status:'DRAFT'|'CANCELLED';subtotal:number;discount:number;taxableAmount:number;gstRate:number;gstAmount:number;grandTotal:number;createdAt:string;items:{id:number;sku:string;description:string;quantity:number;unitPrice:number;lineTotal:number}[]};
type Page<T>={content:T[];totalPages:number;totalElements:number};
const currency=(n:number)=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',minimumFractionDigits:2,maximumFractionDigits:2}).format(n);
async function billingRequest<T>(path:string,token:string,init:RequestInit={}):Promise<T>{
 const res=await fetch('/api/billing'+path,{...init,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json',...init.headers}});
 if(!res.ok){
  if(res.status===401)throw new Error('Session expired. Please sign out and log in again.');
  if(res.status===403)throw new Error('You do not have permission for billing.');
  let message='';try{const body=await res.json();message=body.detail||body.message||body.title||''}catch{}
  throw new Error(message||'Billing request failed (HTTP '+res.status+').');
 }
 return res.json() as Promise<T>;
}
export function Billing({token,roles}:{token:string;roles:string[]}){
 const [tab,setTab]=useState<'create'|'history'>('create');
 const [customerName,setCustomerName]=useState('');const [customerPhone,setCustomerPhone]=useState('');
 const [discount,setDiscount]=useState('0');const [items,setItems]=useState<BillItem[]>([]);
 const [products,setProducts]=useState<Product[]>([]);const [productPage,setProductPage]=useState(0);const [productTotalPages,setProductTotalPages]=useState(0);
 const [barcode,setBarcode]=useState('');const [scanning,setScanning]=useState(false);const [customerEmail,setCustomerEmail]=useState('');
 const [productSearch,setProductSearch]=useState('');const [loadingProducts,setLoadingProducts]=useState(false);
 const [history,setHistory]=useState<Invoice[]>([]);const [historyPage,setHistoryPage]=useState(0);const [historyPages,setHistoryPages]=useState(0);
 const [historyLoading,setHistoryLoading]=useState(false);const [saving,setSaving]=useState(false);
 const [error,setError]=useState('');const [notice,setNotice]=useState('');const [selected,setSelected]=useState<Invoice|null>(null);
 const canCancel=roles.some(role=>['ADMIN','MANAGER','ROLE_ADMIN','ROLE_MANAGER'].includes(role));
 const loadProducts=useCallback(async()=>{setLoadingProducts(true);try{const data=await inventoryRequest<Page<Product>>('/products?page='+productPage+'&size=30',token);setProducts(data.content.filter(p=>p.stockStatus==='AVAILABLE'));setProductTotalPages(data.totalPages)}catch(e){setError(e instanceof Error?e.message:'Unable to load inventory')}finally{setLoadingProducts(false)}},[productPage,token]);
 const loadHistory=useCallback(async()=>{setHistoryLoading(true);try{const data=await billingRequest<Page<Invoice>>('/invoices?page='+historyPage+'&size=10',token);setHistory(data.content);setHistoryPages(data.totalPages)}catch(e){setError(e instanceof Error?e.message:'Unable to load invoices')}finally{setHistoryLoading(false)}},[historyPage,token]);
 useEffect(()=>{void loadProducts()},[loadProducts]);
 useEffect(()=>{if(tab==='history')void loadHistory()},[loadHistory,tab]);
 const subtotal=useMemo(()=>items.reduce((sum,item)=>sum+Math.round(item.product.sellingPrice*100)*item.quantity,0)/100,[items]);
 const parsedDiscount=Number(discount)||0;
 const taxable=Math.max(0,subtotal-parsedDiscount);
 function addProduct(p:Product){setItems(old=>old.some(x=>x.product.id===p.id)?old:[...old,{product:p,quantity:1}]);setNotice('');setError('')}
 async function scanSku(e:FormEvent<HTMLFormElement>){
  e.preventDefault();const sku=barcode.trim();if(!sku)return;
  setScanning(true);setError('');setNotice('');
  try{
   // Current inventory API exposes paginated listings but no SKU lookup.
   // Scan through pages until found; replace with a dedicated SKU endpoint for large catalogues.
   let match:Product|undefined;let page=0;let pages=1;
   do{
    const data=await inventoryRequest<Page<Product>>('/products?page='+page+'&size=100',token);
    match=data.content.find(p=>p.sku.toLowerCase()===sku.toLowerCase());
    pages=data.totalPages;page++;
   }while(!match&&page<pages&&page<100);
   if(!match)throw new Error('SKU not found. For very large catalogues, a dedicated SKU lookup endpoint is required.');
   if(match.stockStatus!=='AVAILABLE')throw new Error('This jewellery item is '+match.stockStatus+' and cannot be added.');
   if(items.some(item=>item.product.id===match!.id))throw new Error('This item is already on the bill.');
   addProduct(match);setBarcode('');setNotice('Scanned '+match.sku+' — added to draft.');
  }catch(e){setError(e instanceof Error?e.message:'Could not scan item')}finally{setScanning(false)}
 }
 function removeProduct(id:number){setItems(old=>old.filter(x=>x.product.id!==id))}
 async function saveDraft(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setError('');setNotice('');
  if(!customerName.trim()){setError('Customer name is required.');return}
  if(items.length===0){setError('Select at least one available product.');return}
  if(!Number.isFinite(parsedDiscount)||parsedDiscount<0||parsedDiscount>subtotal){setError('Discount must be between zero and subtotal.');return}
  setSaving(true);
  try{
   const invoice=await billingRequest<Invoice>('/invoices',token,{method:'POST',body:JSON.stringify({
    customerName:customerName.trim(),customerPhone:customerPhone.trim()||null,discount:parsedDiscount,
    items:items.map(({product,quantity})=>({productId:product.id,sku:product.sku,description:product.name,quantity,unitPrice:product.sellingPrice}))
   })});
   setSelected(invoice);setNotice('Draft '+invoice.invoiceNumber+' saved successfully. No payment or stock deduction has occurred.');
   setCustomerName('');setCustomerPhone('');setDiscount('0');setItems([]);setHistoryPage(0);
  }catch(e){setError(e instanceof Error?e.message:'Could not save draft')}finally{setSaving(false)}
 }
 async function openInvoice(id:number){try{setSelected(await billingRequest<Invoice>('/invoices/'+id,token));setError('')}catch(e){setError(e instanceof Error?e.message:'Unable to load invoice')}}
 async function cancelInvoice(id:number){
  if(!window.confirm('Cancel this draft invoice?'))return;
  try{await billingRequest<Invoice>('/invoices/'+id+'/cancel',token,{method:'POST'});setSelected(null);setNotice('Draft cancelled.');await loadHistory()}catch(e){setError(e instanceof Error?e.message:'Could not cancel draft')}
 }
 function draftText(inv:Invoice){
  return ['SHREE JEWELLERS — DRAFT ESTIMATE','Not a tax invoice or payment receipt','Reference: '+inv.invoiceNumber,'Customer: '+inv.customerName,
   ...inv.items.map(item=>item.description+' ('+item.sku+') x'+item.quantity+' — '+currency(item.lineTotal)),
   'Subtotal: '+currency(inv.subtotal),'Discount: '+currency(inv.discount),'GST ('+inv.gstRate+'%): '+currency(inv.gstAmount),'Estimated total: '+currency(inv.grandTotal),
   'Draft only. Subject to stock and final price confirmation.'].join('\\n');
 }
 function printDraft(inv:Invoice){
  const popup=window.open('','_blank','width=820,height=700');
  if(!popup){setError('Allow pop-ups to print the draft.');return}
  const escapeHtml=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c));
  const body=escapeHtml(draftText(inv));
  popup.document.write('<!doctype html><html><head><title>Draft '+escapeHtml(inv.invoiceNumber)+'</title><style>body{font:15px Arial,sans-serif;max-width:720px;margin:40px auto;color:#243b2e}pre{white-space:pre-wrap;font:inherit;line-height:1.9}.watermark{font-size:32px;color:#b85d3c;font-weight:bold}</style></head><body><div class="watermark">DRAFT — NOT A TAX INVOICE</div><pre>'+body+'</pre></body></html>');
  popup.document.close();popup.focus();popup.print();
 }
 function emailDraft(inv:Invoice){
  const email=customerEmail.trim();
  if(!email){setError('Enter the customer email address in the new invoice form before using email sharing.');return}
  window.location.href='mailto:'+encodeURIComponent(email)+'?subject='+encodeURIComponent('Shree Jewellers draft estimate '+inv.invoiceNumber)+'&body='+encodeURIComponent(draftText(inv));
 }
 function smsDraft(inv:Invoice){
  const phone=(inv.customerPhone||'').replace(/[^+0-9]/g,'');
  if(!phone){setError('Customer phone number is missing on this draft.');return}
  window.location.href='sms:'+phone+'?body='+encodeURIComponent(draftText(inv));
 }
 const filtered=products.filter(p=>[p.name,p.sku,p.category,p.metal].some(v=>v.toLowerCase().includes(productSearch.toLowerCase())));
 return <section className="billing-screen">
 <div className="billing-header"><div><span className="overline">SALES & BILLING</span><h1>Jewellery Billing</h1><p>Create draft invoices and review saved bills.</p></div><span className="billing-draft-badge">Draft billing only</span></div>
 <div className="billing-tabs"><button className={tab==='create'?'selected':''} onClick={()=>{setTab('create');setError('')}}><Plus size={17}/> New Invoice</button><button className={tab==='history'?'selected':''} onClick={()=>{setTab('history');setError('')}}><FileText size={17}/> Invoice History</button></div>
 {error&&<div className="inventory-error" role="alert">{error}</div>}
 {notice&&<div className="billing-notice" role="status">{notice}</div>}
 {tab==='create'?<form onSubmit={saveDraft}>
 <div className="billing-layout"><div className="billing-left">
 <section className="erp-panel billing-panel"><div className="billing-panel-title"><h2>Customer Details</h2><span>01</span></div><div className="billing-fields"><label>Customer name *<input value={customerName} onChange={e=>setCustomerName(e.target.value)} maxLength={160} required placeholder="Enter customer name"/></label><label>Mobile number<input value={customerPhone} onChange={e=>setCustomerPhone(e.target.value)} maxLength={25} placeholder="Optional"/></label><label>Email address (for sharing)<input type="email" value={customerEmail} onChange={e=>setCustomerEmail(e.target.value)} placeholder="Optional — not saved to backend"/></label></div></section>
 <section className="erp-panel billing-panel"><div className="billing-panel-title"><h2>Select Jewellery</h2><span>02</span></div><form className="billing-scan" onSubmit={scanSku}><ScanBarcode size={21}/><input autoComplete="off" aria-label="Scan barcode or enter SKU" placeholder="Scan barcode or type SKU and press Enter" value={barcode} onChange={e=>setBarcode(e.target.value)}/><button type="submit" disabled={scanning}>{scanning?'Finding…':'Add SKU'}</button></form><p className="billing-caption">Connect a USB/Bluetooth barcode scanner in keyboard mode. Print or encode the exact product SKU on each tag.</p><label className="billing-product-search"><Search size={17}/><input aria-label="Filter available jewellery on current page" placeholder="Filter by SKU, product or metal..." value={productSearch} onChange={e=>setProductSearch(e.target.value)}/></label><p className="billing-caption">Available products · current inventory page (server-side search coming later)</p>
 {loadingProducts?<p className="inventory-message">Loading jewellery…</p>:<div className="billing-products">{filtered.length===0?<p className="inventory-message">No available products on this page.</p>:filtered.map(p=><div className="billing-product" key={p.id}><div><strong>{p.name}</strong><small>{p.sku} · {p.metal} {p.purity} · {p.netWeight} g</small></div><span>{currency(p.sellingPrice)}</span><button type="button" onClick={()=>addProduct(p)} disabled={items.some(x=>x.product.id===p.id)}>{items.some(x=>x.product.id===p.id)?'Added':'+ Add'}</button></div>)}</div>}
 <div className="billing-page-controls"><button type="button" disabled={productPage===0} onClick={()=>setProductPage(p=>p-1)}><ChevronLeft size={15}/> Prev</button><span>Page {productPage+1} / {Math.max(productTotalPages,1)}</span><button type="button" disabled={productPage+1>=productTotalPages} onClick={()=>setProductPage(p=>p+1)}>Next <ChevronRight size={15}/></button></div>
 </section>
 <section className="erp-panel billing-panel"><div className="billing-panel-title"><h2>Invoice Items</h2><span>03</span></div>{items.length===0?<div className="billing-empty"><ReceiptIndianRupee size={26}/><p>Select jewellery to add it to the draft.</p></div>:<div className="inventory-scroll"><table className="inventory-table"><thead><tr><th>Product</th><th>Qty</th><th>Unit price</th><th>Total</th><th></th></tr></thead><tbody>{items.map(item=><tr key={item.product.id}><td><strong>{item.product.name}</strong><small>{item.product.sku}</small></td><td>1</td><td>{currency(item.product.sellingPrice)}</td><td>{currency(item.product.sellingPrice)}</td><td><button className="inventory-edit" type="button" aria-label={'Remove '+item.product.name} onClick={()=>removeProduct(item.product.id)}><Trash2 size={15}/></button></td></tr>)}</tbody></table></div>}<p className="billing-caption">Each inventory record represents one unique jewellery item; quantity is fixed at 1.</p></section>
 </div><aside className="erp-panel billing-summary"><div className="billing-panel-title"><h2>Bill Summary</h2><ReceiptIndianRupee size={20}/></div><div className="billing-summary-line"><span>Items</span><strong>{items.length}</strong></div><div className="billing-summary-line"><span>Subtotal</span><strong>{currency(subtotal)}</strong></div><label className="billing-discount">Discount (₹)<input type="number" min="0" max={subtotal} step="0.01" value={discount} onChange={e=>setDiscount(e.target.value)}/></label><div className="billing-summary-line"><span>Taxable amount</span><strong>{currency(taxable)}</strong></div><div className="billing-summary-line"><span>GST</span><strong>Calculated by backend</strong></div><div className="billing-summary-total"><span>Before GST</span><strong>{currency(taxable)}</strong></div><p className="billing-caption">Final GST and grand total are calculated by Billing Service when saving. The configured tax rate must be verified for your sale.</p><button className="inventory-primary billing-save" disabled={saving||items.length===0} type="submit">{saving?'Saving draft…':'Save Draft Invoice'}</button><p className="billing-warning">Saving a draft does not collect payment, reserve inventory or complete a sale.</p></aside></div>
 </form>:<section className="erp-panel billing-panel"><div className="billing-history-head"><h2>Saved Invoices</h2><button className="inventory-secondary" onClick={()=>void loadHistory()}><RefreshCw size={16}/> Refresh</button></div>{historyLoading?<p className="inventory-message">Loading invoices…</p>:history.length===0?<div className="billing-empty"><FileText size={30}/><p>No draft invoices found.</p></div>:<div className="inventory-scroll"><table className="inventory-table"><thead><tr><th>Draft number</th><th>Customer</th><th>Created</th><th>Grand total</th><th>Status</th><th></th></tr></thead><tbody>{history.map(inv=><tr key={inv.id}><td><strong>{inv.invoiceNumber}</strong></td><td>{inv.customerName}</td><td>{inv.createdAt?new Date(inv.createdAt).toLocaleString('en-IN'):'—'}</td><td>{currency(inv.grandTotal)}</td><td><span className={'billing-status '+(inv.status==='DRAFT'?'draft':'cancelled')}>{inv.status}</span></td><td><button className="inventory-secondary" onClick={()=>void openInvoice(inv.id)}>View</button></td></tr>)}</tbody></table></div>}<div className="billing-page-controls"><button disabled={historyPage===0} onClick={()=>setHistoryPage(p=>p-1)}><ChevronLeft size={15}/> Prev</button><span>Page {historyPage+1} / {Math.max(historyPages,1)}</span><button disabled={historyPage+1>=historyPages} onClick={()=>setHistoryPage(p=>p+1)}>Next <ChevronRight size={15}/></button></div></section>}
 {selected&&<div className="inventory-modal-backdrop" onClick={()=>setSelected(null)}><section className="inventory-modal billing-detail" role="dialog" aria-modal="true" aria-label="Draft invoice details" onClick={e=>e.stopPropagation()}><header><div><span className="overline">INVOICE DETAILS</span><h2>{selected.invoiceNumber}</h2><p>{selected.customerName} {selected.customerPhone?'· '+selected.customerPhone:''}</p></div><button onClick={()=>setSelected(null)} aria-label="Close invoice">✕</button></header><span className={'billing-status '+(selected.status==='DRAFT'?'draft':'cancelled')}>{selected.status}</span><div className="inventory-scroll"><table className="inventory-table"><thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody>{selected.items.map((item,i)=><tr key={item.id??i}><td>{item.description}<small>{item.sku}</small></td><td>{item.quantity}</td><td>{currency(item.unitPrice)}</td><td>{currency(item.lineTotal)}</td></tr>)}</tbody></table></div><div className="billing-detail-totals"><div>Subtotal <strong>{currency(selected.subtotal)}</strong></div><div>Discount <strong>−{currency(selected.discount)}</strong></div><div>GST ({selected.gstRate}%) <strong>{currency(selected.gstAmount)}</strong></div><div className="grand">Grand total <strong>{currency(selected.grandTotal)}</strong></div></div><p className="billing-warning">Internal draft only — not a tax invoice or proof of payment. Print and sharing actions label this document as a draft. Email and SMS open your device apps; they do not send automatically.</p><div className="billing-share-actions"><button className="inventory-secondary" onClick={()=>printDraft(selected)}><Printer size={16}/> Print draft</button><button className="inventory-secondary" onClick={()=>emailDraft(selected)}><Mail size={16}/> Email draft</button><button className="inventory-secondary" onClick={()=>smsDraft(selected)}><MessageSquare size={16}/> SMS draft</button></div>{selected.status==='DRAFT'&&canCancel&&<button className="inventory-secondary" onClick={()=>void cancelInvoice(selected.id)}>Cancel Draft</button>}</section></div>}
 </section>;
}
