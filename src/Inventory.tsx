import {useCallback,useEffect,useState,type FormEvent} from 'react';
import {Plus,RefreshCw,Pencil,X,Package} from 'lucide-react';
export type Product={id:number;sku:string;name:string;category:string;metal:string;purity:string;grossWeight:number;netWeight:number;stoneWeight:number;makingCharges:number;sellingPrice:number;stockStatus:StockStatus};
export type StockStatus='AVAILABLE'|'RESERVED'|'SOLD'|'DAMAGED';
export type InventorySummary={totalProducts:number;availableProducts:number;reservedProducts:number;soldProducts:number;damagedProducts:number};
type ProductInput=Omit<Product,'id'>;
const initial:ProductInput={sku:'',name:'',category:'',metal:'Gold',purity:'22K',grossWeight:0,netWeight:0,stoneWeight:0,makingCharges:0,sellingPrice:0,stockStatus:'AVAILABLE'};
export async function inventoryRequest<T>(path:string,token:string,options:RequestInit={}):Promise<T>{
 const response=await fetch('/api/inventory'+path,{...options,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json',...options.headers}});
 if(!response.ok){if(response.status===401)throw new Error('Your token is invalid or expired. Please sign out and log in again.');if(response.status===403)throw new Error('You do not have permission to perform this action.');let detail='';try{const data=await response.json();detail=data.detail||data.message||data.title||''}catch{}throw new Error(detail||'Inventory request failed (HTTP '+response.status+').')}
 return response.json() as Promise<T>;
}
export function useInventorySummary(token:string){
 const [summary,setSummary]=useState<InventorySummary|null>(null);
 const [error,setError]=useState('');
 const reload=useCallback(async()=>{try{setSummary(await inventoryRequest<InventorySummary>('/summary',token));setError('')}catch(e){setError(e instanceof Error?e.message:'Unable to load inventory')}},[token]);
 useEffect(()=>{void reload()},[reload]);
 return {summary,error,reload};
}
export function Inventory({token,roles,onChanged}:{token:string;roles:string[];onChanged:()=>void}){
 const [products,setProducts]=useState<Product[]>([]);
 const [page,setPage]=useState(0);const [totalPages,setTotalPages]=useState(0);const [total,setTotal]=useState(0);
 const [loading,setLoading]=useState(true);const [error,setError]=useState('');const [saving,setSaving]=useState(false);
 const [editing,setEditing]=useState<number|null>(null);const [showForm,setShowForm]=useState(false);const [form,setForm]=useState<ProductInput>(initial);
 const [search,setSearch]=useState('');
 const canEdit=roles.some(r=>['ADMIN','MANAGER','ROLE_ADMIN','ROLE_MANAGER'].includes(r));
 const load=useCallback(async()=>{setLoading(true);try{const data=await inventoryRequest<{content:Product[];totalPages:number;totalElements:number}>('/products?page='+page+'&size=10',token);setProducts(data.content);setTotalPages(data.totalPages);setTotal(data.totalElements);setError('')}catch(e){setError(e instanceof Error?e.message:'Failed to load products')}finally{setLoading(false)}},[page,token]);
 useEffect(()=>{void load()},[load]);
 function openForm(product?:Product){if(product){const {id,...rest}=product;setEditing(id);setForm(rest)}else{setEditing(null);setForm({...initial})}setError('');setShowForm(true)}
 function update<K extends keyof ProductInput>(key:K,value:ProductInput[K]){setForm(prev=>({...prev,[key]:value}))}
 async function save(e:FormEvent<HTMLFormElement>){e.preventDefault();if(form.netWeight>form.grossWeight){setError('Net weight cannot exceed gross weight.');return}setSaving(true);setError('');try{await inventoryRequest<Product>(editing===null?'/products':'/products/'+editing,token,{method:editing===null?'POST':'PUT',body:JSON.stringify(form)});setShowForm(false);setPage(0);await load();onChanged()}catch(e){setError(e instanceof Error?e.message:'Unable to save product')}finally{setSaving(false)}}
 const filtered=products.filter(p=>[p.name,p.sku,p.category,p.metal].some(v=>v.toLowerCase().includes(search.toLowerCase())));
 const money=(n:number)=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2}).format(n);
 return <section className="inventory-screen"><div className="inventory-header"><div><span className="overline">PRODUCT CATALOGUE</span><h1>Jewellery Inventory</h1><p>Manage products, weights, pricing and stock status.</p></div><div className="inventory-actions"><button className="inventory-secondary" onClick={()=>void load()}><RefreshCw size={16}/> Refresh</button>{canEdit&&<button className="inventory-primary" onClick={()=>openForm()}><Plus size={17}/> Add Product</button>}</div></div>
 <div className="erp-panel inventory-table-panel"><div className="inventory-toolbar"><strong>All products <span>({total})</span></strong><input aria-label="Filter current page" placeholder="Filter current page..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
 {error&&!showForm&&<div className="inventory-error" role="alert">{error}</div>}
 {loading?<p className="inventory-message">Loading inventory…</p>:products.length===0?<div className="inventory-empty"><Package size={32}/><strong>No jewellery products yet</strong><p>Add your first product to get started.</p></div>:<div className="inventory-scroll"><table className="inventory-table"><thead><tr><th>SKU</th><th>Product</th><th>Metal / Purity</th><th>Net Weight</th><th>Selling Price</th><th>Status</th>{canEdit&&<th>Action</th>}</tr></thead><tbody>{filtered.map(p=><tr key={p.id}><td>{p.sku}</td><td><strong>{p.name}</strong><small>{p.category}</small></td><td>{p.metal} / {p.purity}</td><td>{p.netWeight.toFixed(3)} g</td><td>{money(p.sellingPrice)}</td><td><span className={'stock-pill stock-'+p.stockStatus.toLowerCase()}>{p.stockStatus}</span></td>{canEdit&&<td><button className="inventory-edit" aria-label={'Edit '+p.name} onClick={()=>openForm(p)}><Pencil size={16}/></button></td>}</tr>)}</tbody></table>{filtered.length===0&&<p className="inventory-message">No matching products on this page.</p>}</div>}
 <div className="inventory-pagination"><span>Page {page+1} of {Math.max(totalPages,1)} · {total} products</span><div><button disabled={page===0||loading} onClick={()=>setPage(p=>p-1)}>Previous</button><button disabled={page+1>=totalPages||loading} onClick={()=>setPage(p=>p+1)}>Next</button></div></div></div>
 {showForm&&<div className="inventory-modal-backdrop" onClick={()=>setShowForm(false)}><section className="inventory-modal" role="dialog" aria-modal="true" aria-label={editing===null?'Add product':'Edit product'} onClick={e=>e.stopPropagation()}><header><div><span className="overline">INVENTORY</span><h2>{editing===null?'Add Jewellery Product':'Edit Jewellery Product'}</h2></div><button aria-label="Close" onClick={()=>setShowForm(false)}><X size={20}/></button></header><form onSubmit={save}><div className="inventory-form-grid">
 {([['sku','SKU'],['name','Product name'],['category','Category']] as const).map(([key,label])=><label key={key}>{label}<input required maxLength={key==='name'?160:key==='sku'?60:80} value={form[key]} onChange={e=>update(key,e.target.value)}/></label>)}
 <label>Metal<select value={form.metal} onChange={e=>update('metal',e.target.value)}><option>Gold</option><option>Silver</option><option>Platinum</option><option>Other</option></select></label>
 <label>Purity<input required maxLength={30} value={form.purity} onChange={e=>update('purity',e.target.value)}/></label>
 <label>Stock status<select value={form.stockStatus} onChange={e=>update('stockStatus',e.target.value as StockStatus)}>{(['AVAILABLE','RESERVED','SOLD','DAMAGED'] as const).map(s=><option key={s}>{s}</option>)}</select></label>
 {([['grossWeight','Gross weight (g)'],['netWeight','Net weight (g)'],['stoneWeight','Stone weight (g)'],['makingCharges','Making charges (₹)'],['sellingPrice','Selling price (₹)']] as const).map(([key,label])=><label key={key}>{label}<input type="number" required min="0" step={key.endsWith('Weight')?'0.001':'0.01'} value={form[key]} onChange={e=>update(key,Number(e.target.value))}/></label>)}
 </div>{error&&<div className="inventory-error" role="alert">{error}</div>}<footer><button type="button" className="inventory-secondary" onClick={()=>setShowForm(false)}>Cancel</button><button type="submit" className="inventory-primary" disabled={saving}>{saving?'Saving…':editing===null?'Create Product':'Save Changes'}</button></footer></form></section></div>}
 </section>;
}
