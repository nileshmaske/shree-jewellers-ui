import {useCallback,useEffect,useMemo,useState,type FormEvent} from 'react';
import {Plus,Trash2,RefreshCw,ReceiptIndianRupee,Search,FileText,ChevronLeft,ChevronRight,ScanBarcode,Printer,MessageSquare} from 'lucide-react';
import {inventoryRequest,type Product} from './Inventory';
import { formatINR as currency } from './format';
import { Modal } from './Modal';

type BillItem={product:Product;quantity:number};
type Invoice={id:number;invoiceNumber:string;customerName:string;customerPhone:string|null;status:'DRAFT'|'CANCELLED';subtotal:number;discount:number;taxableAmount:number;gstRate:number;gstAmount:number;grandTotal:number;createdAt:string;items:{id:number;sku:string;description:string;quantity:number;unitPrice:number;lineTotal:number}[]};
type Page<T>={content:T[];totalPages:number;totalElements:number};
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
 const [barcode,setBarcode]=useState('');const [scanning,setScanning]=useState(false);
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
 async function scanSku(){const sku=barcode.trim();if(!sku)return;
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
  const popup=window.open('','_blank','width=900,height=760');
  if(!popup){setError('Allow pop-ups to print the draft.');return}
  const esc=(v:unknown)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c));
  const amount=(v:number)=>esc(currency(v));
  const date=inv.createdAt?new Date(inv.createdAt).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'}):'—';
  const rows=inv.items.map((item,index)=>'<tr><td class="center">'+(index+1)+'</td><td><strong>'+esc(item.description)+'</strong><small>SKU: '+esc(item.sku)+'</small></td><td class="center">'+esc(item.quantity)+'</td><td class="right">'+amount(item.unitPrice)+'</td><td class="right">'+amount(item.lineTotal)+'</td></tr>').join('');
  const html=`<!doctype html><html lang="en"><head><meta charset="UTF-8"><title>Draft Estimate - ${esc(inv.invoiceNumber)}</title>
  <style>
  @page{size:A4;margin:14mm}
  *{box-sizing:border-box}
  body{margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#24352b;background:#fff}
  .sheet{max-width:210mm;margin:0 auto}
  .brand{display:flex;justify-content:space-between;align-items:start;gap:20px;border-bottom:3px solid #244c38;padding-bottom:16px}
  .brand h1{font-family:Georgia,serif;font-size:27px;letter-spacing:1.5px;color:#214c36;margin:0 0 5px}
  .brand p{margin:0;color:#67766c;font-size:11px}
  .draft{border:2px solid #a97831;padding:9px 12px;text-align:center;font-weight:bold;color:#8a5b20;letter-spacing:1px;font-size:12px}
  .draft small{display:block;font-size:9px;margin-top:5px;letter-spacing:0}
  .heading{text-align:center;margin:20px 0 15px;font-size:16px;font-weight:bold;letter-spacing:1px}
  .details{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin:18px 0 22px}
  .details>div{border:1px solid #dfe5df;padding:12px 14px;min-height:90px}
  .label{font-size:10px;text-transform:uppercase;letter-spacing:.7px;color:#718277;font-weight:bold;margin-bottom:9px}
  .details p{margin:6px 0;line-height:1.5;overflow-wrap:anywhere}
  table{width:100%;border-collapse:collapse}
  th{background:#eef3ee;color:#2d503a;text-transform:uppercase;letter-spacing:.3px;font-size:10px;text-align:left;padding:11px 9px;border:1px solid #d7e1d7}
  td{border:1px solid #e0e7e0;padding:11px 9px;vertical-align:top;overflow-wrap:anywhere}
  td small{display:block;color:#718277;margin-top:5px}
  .center{text-align:center}.right{text-align:right;white-space:nowrap}
  .totals{width:310px;max-width:100%;margin:20px 0 20px auto}
  .totals div{display:flex;justify-content:space-between;gap:12px;padding:9px 3px;border-bottom:1px solid #e6eae5}
  .totals div span:last-child{font-weight:bold;white-space:nowrap}
  .totals .grand{font-size:16px;color:#214c36;border-top:2px solid #214c36;border-bottom:2px solid #214c36;padding:13px 3px}
  .notice{border:1px solid #d6dcd6;background:#f7f9f7;padding:12px 14px;line-height:1.7;color:#576b5d;margin-top:22px}
  footer{display:flex;justify-content:space-between;gap:20px;border-top:1px solid #dfe5df;padding-top:13px;margin-top:30px;color:#78877b;font-size:10px}
  .print-actions{display:flex;justify-content:flex-end;margin:0 0 20px}
  .print-actions button{background:#24563b;border:0;color:#fff;border-radius:7px;padding:11px 18px;cursor:pointer}
  tr{break-inside:avoid}
  @media print{.print-actions{display:none}.sheet{max-width:none}body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
  @media screen{body{padding:24px;background:#eef1ec}.sheet{background:#fff;padding:30px;box-shadow:0 6px 25px #00000012}}
  </style></head><body><div class="sheet">
  <div class="print-actions"><button onclick="window.print()">Print Estimate</button></div>
  <header class="brand"><div><h1>SHREE JEWELLERS</h1><p>Jewellery Estimate · Customer Copy</p></div><div class="draft">DRAFT ESTIMATE<small>NOT A TAX INVOICE</small></div></header>
  <div class="heading">JEWELLERY ESTIMATE</div>
  <section class="details"><div><div class="label">Customer details</div><p><strong>${esc(inv.customerName)}</strong></p><p>Mobile: ${esc(inv.customerPhone||'Not provided')}</p></div>
  <div><div class="label">Estimate details</div><p><strong>Reference:</strong> ${esc(inv.invoiceNumber)}</p><p><strong>Date:</strong> ${esc(date)}</p><p><strong>Status:</strong> ${esc(inv.status)}</p></div></section>
  <table><thead><tr><th style="width:7%">#</th><th>Jewellery description</th><th style="width:9%" class="center">Qty</th><th style="width:19%" class="right">Unit price</th><th style="width:19%" class="right">Amount</th></tr></thead><tbody>${rows}</tbody></table>
  <section class="totals"><div><span>Subtotal</span><span>${amount(inv.subtotal)}</span></div><div><span>Discount</span><span>− ${amount(inv.discount)}</span></div><div><span>Taxable amount</span><span>${amount(inv.taxableAmount)}</span></div><div><span>Estimated GST (${esc(inv.gstRate)}%)</span><span>${amount(inv.gstAmount)}</span></div><div class="grand"><span>Estimated total</span><span>${amount(inv.grandTotal)}</span></div></section>
  <div class="notice"><strong>Important:</strong> This document is a draft estimate only. It is not a GST tax invoice, payment receipt or confirmation of sale. Prices, tax, stock availability and final amounts are subject to verification before checkout.</div>
  <footer><span>Shree Jewellers · Computer-generated draft estimate</span><span>Thank you for visiting</span></footer>
  </div></body></html>`;
  popup.document.open();popup.document.write(html);popup.document.close();popup.focus();
 }
 async function smsDraft(inv:Invoice){
  const phone=(inv.customerPhone||'').replace(/[^+0-9]/g,'');
  if(!phone){setError('Customer phone number is required for SMS.');return}
  if(!window.confirm('Send this draft estimate via MSG91 SMS to '+phone+'?'))return;
  setError('');
  try{
   await billingRequest<{status:string;channel:string}>('/invoices/'+inv.id+'/send-sms',token,{method:'POST',body:JSON.stringify({phone})});
   setNotice('MSG91 accepted the SMS request. Delivery to the handset is not yet confirmed.');
   setSelected(null);
  }catch(e){setError(e instanceof Error?e.message:'Unable to send SMS')}
 }
 const query = productSearch.trim().toLowerCase();
 const filtered = products.filter(product =>
  [product.name, product.sku, product.category, product.metal].some(value => value.toLowerCase().includes(query)),
 );

 return (
  <section aria-labelledby="billing-title">
   <div className="page-heading">
    <div>
     <h1 id="billing-title">Billing</h1>
     <p>Create draft estimates and review saved invoices.</p>
    </div>
   </div>

   <div className="billing-tabs" role="group" aria-label="Billing views">
    <button type="button" aria-pressed={tab === 'create'} onClick={() => { setTab('create'); setError(''); }}>
     <Plus size={17} aria-hidden="true" /> New invoice
    </button>
    <button type="button" aria-pressed={tab === 'history'} onClick={() => { setTab('history'); setError(''); }}>
     <FileText size={17} aria-hidden="true" /> Invoice history
    </button>
   </div>
   {error && !selected && <p className="alert alert-error" role="alert">{error}</p>}
   {notice && <p className="alert alert-success" role="status">{notice}</p>}

   {tab === 'create' ? (
    <form className="billing-layout" onSubmit={saveDraft}>
     <div className="billing-main">
      <section className="surface billing-panel">
       <h2>Customer details</h2>
       <div className="form-grid">
        <label>Customer name
         <input value={customerName} onChange={e => setCustomerName(e.target.value)} maxLength={160} required />
        </label>
        <label>Mobile number
         <input type="tel" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} maxLength={25} placeholder="Optional" />
        </label>
       </div>
      </section>

      <section className="surface billing-panel">
       <h2>Select jewellery</h2>
       <div className="billing-scan">
        <div className="field-with-icon">
         <ScanBarcode size={20} aria-hidden="true" />
         <input
          autoComplete="off"
          aria-label="Scan barcode or enter SKU"
          placeholder="Scan barcode or enter SKU"
          value={barcode}
          onChange={e => setBarcode(e.target.value)}
          onKeyDown={e => {
           if (e.key === 'Enter') {
            e.preventDefault();
            void scanSku();
           }
          }}
         />
        </div>
        <button className="button button-secondary" type="button" onClick={() => void scanSku()} disabled={scanning}>
         {scanning ? 'Finding…' : 'Add SKU'}
        </button>
       </div>
       <p className="field-hint">Use a keyboard-mode barcode scanner or enter the exact product SKU.</p>
       <div className="billing-products-heading">
        <h3>Available jewellery</h3>
        <label className="field-with-icon filter-field">
         <Search size={17} aria-hidden="true" />
         <input aria-label="Filter available jewellery on this page" placeholder="Filter this page" value={productSearch} onChange={e => setProductSearch(e.target.value)} />
        </label>
       </div>

       {loadingProducts ? <p className="loading-state" role="status">Loading jewellery…</p>
        : filtered.length === 0 ? <p className="loading-state">No matching available products on this page.</p>
        : <ul className="billing-products">
         {filtered.map(product => {
          const added = items.some(item => item.product.id === product.id);
          return (
           <li className="billing-product" key={product.id}>
            <div>
             <strong>{product.name}</strong>
             <small>{product.sku} · {product.metal} {product.purity} · {product.netWeight} g</small>
            </div>
            <span className="billing-product-price">{currency(product.sellingPrice)}</span>
            <button className="button button-secondary button-small" type="button" disabled={added} onClick={() => addProduct(product)}>
             {added ? 'Added' : 'Add'}
            </button>
           </li>
          );
         })}
        </ul>}
       <div className="pagination">
        <span>Page {productPage + 1} of {Math.max(productTotalPages, 1)}</span>
        <div className="button-group">
         <button className="button button-secondary button-small" type="button" disabled={productPage === 0 || loadingProducts} onClick={() => setProductPage(p => p - 1)}><ChevronLeft size={15} aria-hidden="true" /> Previous</button>
         <button className="button button-secondary button-small" type="button" disabled={productPage + 1 >= productTotalPages || loadingProducts} onClick={() => setProductPage(p => p + 1)}>Next <ChevronRight size={15} aria-hidden="true" /></button>
        </div>
       </div>
      </section>

      <section className="surface table-panel">
       <div className="panel-heading"><h2>Invoice items</h2></div>
       {items.length === 0 ? (
        <div className="empty-state empty-state-compact">
         <span className="empty-icon"><ReceiptIndianRupee size={24} aria-hidden="true" /></span>
         <p>Select jewellery to add it to the draft.</p>
        </div>
       ) : (
        <>
         <div className="table-scroll" role="region" aria-label="Invoice items" tabIndex={0}>
          <table className="data-table billing-items-table">
           <thead>
            <tr><th scope="col">Product</th><th scope="col">Qty</th><th scope="col" className="numeric">Unit price</th><th scope="col" className="numeric">Total</th><th scope="col"><span className="sr-only">Actions</span></th></tr>
           </thead>
           <tbody>
            {items.map(({ product, quantity }) => (
             <tr key={product.id}>
              <td><strong>{product.name}</strong><small>{product.sku}</small></td>
              <td>{quantity}</td>
              <td className="numeric">{currency(product.sellingPrice)}</td>
              <td className="numeric"><strong>{currency(product.sellingPrice)}</strong></td>
              <td><button className="icon-button table-action" type="button" aria-label={'Remove ' + product.name} onClick={() => removeProduct(product.id)}><Trash2 size={16} aria-hidden="true" /></button></td>
             </tr>
            ))}
           </tbody>
          </table>
         </div>
         <p className="field-hint table-note">Each inventory record represents one unique jewellery item.</p>
        </>
       )}
      </section>
     </div>

     <aside className="surface billing-panel billing-summary">
      <div className="billing-summary-heading"><h2>Draft summary</h2><ReceiptIndianRupee size={21} aria-hidden="true" /></div>
      <dl className="billing-totals">
       <div><dt>Items</dt><dd>{items.length}</dd></div>
       <div><dt>Subtotal</dt><dd>{currency(subtotal)}</dd></div>
      </dl>
      <label className="billing-discount">Discount (₹)
       <input type="number" min="0" max={subtotal} step="0.01" value={discount} onChange={e => setDiscount(e.target.value)} />
      </label>
      <dl className="billing-totals"><div className="billing-grand"><dt>Total before GST</dt><dd>{currency(taxable)}</dd></div></dl>
      <p className="field-hint">GST and the final total are calculated when you save.</p>
      <button className="button button-primary billing-save" disabled={saving || items.length === 0} type="submit">
       {saving ? 'Saving draft…' : 'Save draft invoice'}
      </button>
      <p className="alert alert-warning">Saving a draft does not collect payment, reserve inventory or complete a sale.</p>
     </aside>
    </form>
   ) : (
    <section className="surface table-panel">
     <div className="panel-heading">
      <h2>Saved invoices</h2>
      <button className="button button-secondary" onClick={() => void loadHistory()} disabled={historyLoading}><RefreshCw size={16} aria-hidden="true" /> Refresh</button>
     </div>
     {historyLoading ? <p className="loading-state" role="status">Loading invoices…</p>
      : history.length === 0 ? (
       <div className="empty-state">
        <span className="empty-icon"><FileText size={25} aria-hidden="true" /></span>
        <strong>No draft invoices found</strong>
       </div>
      ) : (
       <div className="table-scroll" role="region" aria-label="Saved invoices" tabIndex={0}>
        <table className="data-table history-table">
         <thead>
          <tr>
           <th scope="col">Draft number</th><th scope="col">Customer</th><th scope="col">Created</th>
           <th scope="col" className="numeric">Grand total</th><th scope="col">Status</th><th scope="col"><span className="sr-only">Actions</span></th>
          </tr>
         </thead>
         <tbody>
          {history.map(invoice => (
           <tr key={invoice.id}>
            <td><strong>{invoice.invoiceNumber}</strong></td>
            <td>{invoice.customerName}</td>
            <td>{invoice.createdAt ? new Date(invoice.createdAt).toLocaleString('en-IN') : '—'}</td>
            <td className="numeric">{currency(invoice.grandTotal)}</td>
            <td><span className={'status-pill status-' + invoice.status.toLowerCase()}>{invoice.status.toLowerCase()}</span></td>
            <td><button className="button button-secondary button-small" aria-label={'View ' + invoice.invoiceNumber} onClick={() => void openInvoice(invoice.id)}>View</button></td>
           </tr>
          ))}
         </tbody>
        </table>
       </div>
      )}
     <div className="pagination table-pagination">
      <span>Page {historyPage + 1} of {Math.max(historyPages, 1)}</span>
      <div className="button-group">
       <button className="button button-secondary button-small" disabled={historyPage === 0 || historyLoading} onClick={() => setHistoryPage(p => p - 1)}><ChevronLeft size={15} aria-hidden="true" /> Previous</button>
       <button className="button button-secondary button-small" disabled={historyPage + 1 >= historyPages || historyLoading} onClick={() => setHistoryPage(p => p + 1)}>Next <ChevronRight size={15} aria-hidden="true" /></button>
      </div>
     </div>
    </section>
   )}

   {selected && (
    <Modal title={selected.invoiceNumber} subtitle={[selected.customerName, selected.customerPhone].filter(Boolean).join(' · ')} onClose={() => setSelected(null)}>
     <span className={'status-pill status-' + selected.status.toLowerCase()}>{selected.status.toLowerCase()}</span>
     <div className="table-scroll invoice-items" role="region" aria-label="Draft invoice items" tabIndex={0}>
      <table className="data-table billing-items-table">
       <thead><tr><th scope="col">Item</th><th scope="col">Qty</th><th scope="col" className="numeric">Price</th><th scope="col" className="numeric">Total</th></tr></thead>
       <tbody>
        {selected.items.map((item, index) => (
         <tr key={item.id ?? index}><td><strong>{item.description}</strong><small>{item.sku}</small></td><td>{item.quantity}</td><td className="numeric">{currency(item.unitPrice)}</td><td className="numeric">{currency(item.lineTotal)}</td></tr>
        ))}
       </tbody>
      </table>
     </div>
     <dl className="billing-totals invoice-totals">
      <div><dt>Subtotal</dt><dd>{currency(selected.subtotal)}</dd></div>
      <div><dt>Discount</dt><dd>−{currency(selected.discount)}</dd></div>
      <div><dt>GST ({selected.gstRate}%)</dt><dd>{currency(selected.gstAmount)}</dd></div>
      <div className="billing-grand"><dt>Grand total</dt><dd>{currency(selected.grandTotal)}</dd></div>
     </dl>
     <p className="alert alert-warning">Internal draft only. This document is not a tax invoice or proof of payment.</p>
     {error && <p className="alert alert-error" role="alert">{error}</p>}
     <footer className="modal-actions button-group">
      {selected.status === 'DRAFT' && canCancel && <button className="button button-secondary button-danger" onClick={() => void cancelInvoice(selected.id)}>Cancel draft</button>}
      <button className="button button-secondary" onClick={() => void smsDraft(selected)}><MessageSquare size={16} aria-hidden="true" /> SMS draft</button>
      <button className="button button-primary" onClick={() => printDraft(selected)}><Printer size={16} aria-hidden="true" /> Print draft</button>
     </footer>
    </Modal>
   )}
  </section>
 );
}
