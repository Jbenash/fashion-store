import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { errorMessage, useAsync } from '../../lib/useAsync';
import { uploadImage, validateImage } from '../../lib/cloudinary';
import { useToast } from '../../store/toast';
import { Loading } from '../../components/States';
import { TrashIcon } from '../../components/Icons';
import { PLACEHOLDER_IMG, SIZE_OPTIONS } from '../../lib/format';
import type { ProductInput, VariantInput } from '../../lib/types';
import type { CSSProperties, FormEvent } from 'react';

/** Sentinel for the size dropdown's escape hatch. */
const CUSTOM_SIZE = '__custom__';

interface Row extends VariantInput {
  /** Rows already saved cannot be removed — orders reference them. */
  persisted: boolean;
  /** True when this row types its size instead of picking from the list. */
  custom: boolean;
  key: string;
}

const emptyRow = (): Row => ({
  key: crypto.randomUUID(),
  size: '',
  colour: '',
  stock: 0,
  persisted: false,
  custom: false,
});

export default function ProductForm() {
  const { id } = useParams();
  const isEdit = id !== undefined;
  const productId = Number(id);
  const navigate = useNavigate();
  const toast = useToast();

  const categories = useAsync(() => api.categories(), []);
  const existing = useAsync(
    () => (isEdit ? api.adminProduct(productId) : Promise.resolve(null)),
    [isEdit, productId],
  );

  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    bulkMinQty: '',
    bulkPrice: '',
    imageUrl: '',
    imagePublicId: '',
    categoryId: '',
    isActive: true,
  });
  const [rows, setRows] = useState<Row[]>([emptyRow()]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // Hydrate once the product arrives.
  useEffect(() => {
    const p = existing.data;
    if (!p) return;
    setForm({
      name: p.name,
      description: p.description,
      price: String(p.price),
      bulkMinQty: p.bulkMinQty == null ? '' : String(p.bulkMinQty),
      bulkPrice: p.bulkPrice == null ? '' : String(p.bulkPrice),
      imageUrl: p.imageUrl ?? '',
      imagePublicId: p.imagePublicId ?? '',
      categoryId: String(p.category?.id ?? ''),
      isActive: p.isActive,
    });
    setRows(
      (p.variants ?? []).map((v) => ({
        key: `v${v.id}`,
        id: v.id,
        size: v.size,
        colour: v.colour,
        stock: v.stock,
        persisted: true,
        // A stored size outside the standard list still has to show, so such a
        // row opens in free-text mode.
        custom: !(SIZE_OPTIONS as readonly string[]).includes(v.size),
      })),
    );
  }, [existing.data]);

  if (isEdit && existing.loading) return <Loading label="Loading product" />;

  const setField = (key: keyof typeof form, value: string | boolean) =>
    setForm((f) => ({ ...f, [key]: value }));

  const onPickFile = async (file: File | undefined) => {
    if (!file) return;

    const problem = validateImage(file);
    if (problem) {
      toast.push(problem, 'error');
      return;
    }

    setError(null);
    setUploadPct(0);
    try {
      const { url, publicId } = await uploadImage(file, setUploadPct);
      setForm((f) => ({ ...f, imageUrl: url, imagePublicId: publicId }));
      toast.push('Image uploaded.', 'ok');
    } catch (e) {
      toast.push(errorMessage(e), 'error');
    } finally {
      setUploadPct(null);
      // Allow re-picking the same file after a failure.
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const clearImage = () =>
    setForm((f) => ({ ...f, imageUrl: '', imagePublicId: '' }));

  const setRow = (key: string, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const validate = (): string | null => {
    if (!form.name.trim()) return 'Name is required.';
    if (!form.description.trim()) return 'Description is required.';
    if (!form.categoryId) return 'Choose a category.';

    const price = Number(form.price);
    if (!Number.isFinite(price) || price <= 0) return 'Enter a price greater than zero.';

    const hasMin = form.bulkMinQty !== '';
    const hasBulk = form.bulkPrice !== '';
    if (hasMin !== hasBulk) return 'Set both the bulk minimum and the bulk price, or neither.';
    if (hasMin && Number(form.bulkMinQty) < 2) return 'Bulk minimum must be at least 2.';
    if (hasBulk && Number(form.bulkPrice) <= 0) return 'Bulk price must be greater than zero.';
    if (hasBulk && Number(form.bulkPrice) >= price)
      return 'Bulk price should be lower than the unit price.';

    if (form.imageUrl && !/^https?:\/\/\S+$/i.test(form.imageUrl.trim()))
      return 'Image URL must start with http:// or https://';

    const filled = rows.filter((r) => r.size.trim() && r.colour.trim());
    if (filled.length === 0) return 'Add at least one variant with a size and colour.';

    const seen = new Set<string>();
    for (const r of filled) {
      const key = `${r.size.trim().toLowerCase()}|${r.colour.trim().toLowerCase()}`;
      if (seen.has(key)) return `Duplicate variant: ${r.colour} / ${r.size}.`;
      seen.add(key);
    }
    if (filled.some((r) => !Number.isInteger(r.stock) || r.stock < 0))
      return 'Stock must be a whole number of 0 or more.';

    return null;
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const problem = validate();
    setError(problem);
    if (problem) return;

    setSaving(true);
    try {
      const variants: VariantInput[] = rows
        .filter((r) => r.size.trim() && r.colour.trim())
        .map((r) => ({
          ...(r.id === undefined ? {} : { id: r.id }),
          size: r.size.trim(),
          colour: r.colour.trim(),
          stock: Number(r.stock),
        }));

      const base = {
        name: form.name.trim(),
        description: form.description.trim(),
        price: Number(form.price),
        categoryId: Number(form.categoryId),
        variants,
      };

      if (isEdit) {
        // null clears a nullable column; undefined would be dropped by
        // JSON.stringify and the old value would survive.
        await api.updateProduct(productId, {
          ...base,
          bulkMinQty: form.bulkMinQty === '' ? null : Number(form.bulkMinQty),
          bulkPrice: form.bulkPrice === '' ? null : Number(form.bulkPrice),
          imageUrl: form.imageUrl.trim() || null,
          imagePublicId: form.imagePublicId.trim() || null,
          isActive: form.isActive,
        });
        toast.push('Product updated.', 'ok');
      } else {
        const payload: ProductInput = { ...base };
        if (form.bulkMinQty !== '') payload.bulkMinQty = Number(form.bulkMinQty);
        if (form.bulkPrice !== '') payload.bulkPrice = Number(form.bulkPrice);
        if (form.imageUrl.trim()) payload.imageUrl = form.imageUrl.trim();
        if (form.imagePublicId.trim()) payload.imagePublicId = form.imagePublicId.trim();
        await api.createProduct(payload);
        toast.push('Product created.', 'ok');
      }
      navigate('/admin/products');
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <form className="stack" style={{ '--gap': '22px' } as CSSProperties} onSubmit={save}>
      <div className="row row-between row-wrap">
        <h2 style={{ fontSize: '1.5rem' }}>{isEdit ? 'Edit product' : 'New product'}</h2>
        <Link to="/admin/products" className="link-underline small">
          ← Back to products
        </Link>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="panel">
        <div className="panel-head">
          <strong>Details</strong>
        </div>
        <div className="panel-body form-grid">
          <label className="field col-span">
            <span className="label">Name</span>
            <input
              className="input"
              value={form.name}
              maxLength={120}
              onChange={(e) => setField('name', e.target.value)}
            />
          </label>

          <label className="field col-span">
            <span className="label">Description</span>
            <textarea
              className="textarea"
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
            />
          </label>

          <label className="field">
            <span className="label">Category</span>
            <select
              className="select"
              value={form.categoryId}
              onChange={(e) => setField('categoryId', e.target.value)}
            >
              <option value="">Choose…</option>
              {(categories.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="label">Unit price (LKR)</span>
            <input
              className="input"
              type="number"
              min={0}
              step="0.01"
              value={form.price}
              onChange={(e) => setField('price', e.target.value)}
            />
          </label>

          <div className="field col-span">
            <span className="label">Product image</span>

            <div className="uploader">
              <img
                className="uploader-preview"
                src={form.imageUrl || PLACEHOLDER_IMG}
                alt={form.imageUrl ? 'Current product image' : ''}
              />

              <div className="grow stack" style={{ '--gap': '10px' } as CSSProperties}>
                <input
                  ref={fileInput}
                  id="product-image"
                  className="sr-only"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  onChange={(e) => void onPickFile(e.target.files?.[0])}
                  disabled={uploadPct !== null}
                />

                <div className="row row-wrap">
                  <label
                    htmlFor="product-image"
                    className={`btn btn-sm${uploadPct !== null ? ' btn-disabled' : ''}`}
                  >
                    {uploadPct !== null
                      ? `Uploading ${uploadPct}%`
                      : form.imageUrl
                        ? 'Replace image'
                        : 'Upload image'}
                  </label>

                  {form.imageUrl && uploadPct === null && (
                    <button type="button" className="btn btn-sm btn-ghost" onClick={clearImage}>
                      <TrashIcon /> Remove
                    </button>
                  )}
                </div>

                {uploadPct !== null && (
                  <div className="progress" role="progressbar" aria-valuenow={uploadPct}>
                    <div className="progress-bar" style={{ width: `${uploadPct}%` }} />
                  </div>
                )}

                <span className="hint">
                  JPEG, PNG, WebP or AVIF, up to 5&nbsp;MB. Uploads go straight to
                  Cloudinary; only the URL is stored in the database.
                </span>

                <details>
                  <summary className="small muted" style={{ cursor: 'pointer' }}>
                    Or paste an image URL
                  </summary>
                  <input
                    className="input"
                    style={{ marginTop: 8 }}
                    type="url"
                    placeholder="https://…"
                    value={form.imageUrl}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        imageUrl: e.target.value,
                        // A hand-typed URL is not a Cloudinary asset we manage.
                        imagePublicId: '',
                      }))
                    }
                  />
                </details>

                {form.imagePublicId && (
                  <span className="tiny faint mono">Cloudinary: {form.imagePublicId}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <strong>Bulk pricing</strong>
          <span className="small muted">Optional — both fields or neither</span>
        </div>
        <div className="panel-body form-grid">
          <label className="field">
            <span className="label">Minimum quantity</span>
            <input
              className="input"
              type="number"
              min={2}
              value={form.bulkMinQty}
              onChange={(e) => setField('bulkMinQty', e.target.value)}
            />
          </label>
          <label className="field">
            <span className="label">Bulk unit price (LKR)</span>
            <input
              className="input"
              type="number"
              min={0}
              step="0.01"
              value={form.bulkPrice}
              onChange={(e) => setField('bulkPrice', e.target.value)}
            />
          </label>
          <p className="hint col-span">
            Quantities are pooled across every variant of this product before the
            tier is chosen.
          </p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <strong>Variants</strong>
          <button type="button" className="btn btn-sm btn-outline" onClick={() => setRows((r) => [...r, emptyRow()])}>
            Add variant
          </button>
        </div>
        <div className="panel-body">
          <div className="variant-rows">
            {rows.map((r) => (
              <div key={r.key} className="variant-row">
                <input
                  className="input"
                  placeholder="Colour"
                  value={r.colour}
                  disabled={r.persisted}
                  onChange={(e) => setRow(r.key, { colour: e.target.value })}
                  aria-label="Colour"
                />
                {r.custom ? (
                  <div className="size-custom">
                    <input
                      className="input"
                      placeholder="Size"
                      value={r.size}
                      disabled={r.persisted}
                      onChange={(e) => setRow(r.key, { size: e.target.value })}
                      aria-label="Size"
                      autoFocus
                    />
                    {!r.persisted && (
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost"
                        onClick={() => setRow(r.key, { custom: false, size: '' })}
                      >
                        Use list
                      </button>
                    )}
                  </div>
                ) : (
                  <select
                    className="select"
                    value={r.size}
                    disabled={r.persisted}
                    onChange={(e) =>
                      e.target.value === CUSTOM_SIZE
                        ? setRow(r.key, { custom: true, size: '' })
                        : setRow(r.key, { size: e.target.value })
                    }
                    aria-label="Size"
                  >
                    <option value="">Size…</option>
                    {SIZE_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                    <option value={CUSTOM_SIZE}>Other…</option>
                  </select>
                )}
                <input
                  className="input"
                  type="number"
                  min={0}
                  value={r.stock}
                  onChange={(e) => setRow(r.key, { stock: Number(e.target.value) })}
                  aria-label="Stock"
                />
                {r.persisted ? (
                  <span className="tiny muted nowrap">Saved</span>
                ) : (
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
                    aria-label="Remove variant"
                  >
                    <TrashIcon />
                  </button>
                )}
              </div>
            ))}
          </div>

          <p className="hint" style={{ marginTop: 14 }}>
            Saved variants cannot be renamed or deleted because past orders point
            at them. To retire one, set its stock to 0.
          </p>
        </div>
      </div>

      {isEdit && (
        <label className="choice" style={{ maxWidth: 420 }}>
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setField('isActive', e.target.checked)}
          />
          <span>
            <span className="choice-title">Visible on the storefront</span>
            <span className="small muted" style={{ display: 'block' }}>
              Uncheck to hide without affecting order history.
            </span>
          </span>
        </label>
      )}

      <div className="row">
        <button className="btn btn-lg" disabled={saving}>
          {saving ? <span className="spinner" /> : isEdit ? 'Save changes' : 'Create product'}
        </button>
        <Link to="/admin/products" className="btn btn-lg btn-outline">
          Cancel
        </Link>
      </div>
    </form>
  );
}
