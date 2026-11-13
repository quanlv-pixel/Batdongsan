'use client';

import React, { useState, useEffect } from 'react';
import { useDictionary } from '@/i18n';
import { apiClient } from '@/lib/api-client';
import {
  CreateListingInput,
  MyListingItem,
  PropertyType,
  RentalPeriod,
  TransactionType,
} from '@/types';

interface CreateListingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newListing: MyListingItem) => void;
}

const PROPERTY_TYPES: PropertyType[] = [
  'APARTMENT',
  'HOUSE',
  'VILLA',
  'LAND',
  'COMMERCIAL',
  'OTHER',
];

export function CreateListingModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateListingModalProps) {
  const dict = useDictionary();
  const [title, setTitle] = useState('');
  const [transactionType, setTransactionType] = useState<TransactionType>('FOR_SALE');
  const [rentalPeriod, setRentalPeriod] = useState<RentalPeriod>('MONTH');
  const [propertyType, setPropertyType] = useState<PropertyType>('APARTMENT');
  const [priceVnd, setPriceVnd] = useState('');
  const [areaSqm, setAreaSqm] = useState('');
  const [province, setProvince] = useState('TP. Hồ Chí Minh');
  const [district, setDistrict] = useState('Quận 1');
  const [ward, setWard] = useState('Phường Bến Nghé');
  const [streetAddress, setStreetAddress] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [images, setImages] = useState<string[]>([
    'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800',
  ]);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleAddImage = () => {
    if (imageUrl.trim() && !images.includes(imageUrl.trim())) {
      setImages([...images, imageUrl.trim()]);
      setImageUrl('');
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (title.trim().length < 5) {
      setErrorMessage(dict.Workspace.createModal.fieldTitlePlaceholder);
      return;
    }

    if (description.trim().length < 10) {
      setErrorMessage(dict.Workspace.createModal.fieldDescriptionPlaceholder);
      return;
    }

    const priceNum = parseInt(priceVnd.replace(/\D/g, ''), 10);
    if (isNaN(priceNum) || priceNum <= 0) {
      setErrorMessage(dict.Workspace.createModal.fieldPricePlaceholder);
      return;
    }

    const areaNum = parseFloat(areaSqm);
    if (isNaN(areaNum) || areaNum < 1) {
      setErrorMessage(dict.Workspace.createModal.fieldAreaPlaceholder);
      return;
    }

    if (!province.trim() || !district.trim()) {
      setErrorMessage(dict.Workspace.createModal.fieldProvincePlaceholder);
      return;
    }

    const payload: CreateListingInput = {
      title: title.trim(),
      description: description.trim(),
      propertyType,
      transactionType,
      rentalPeriod: transactionType === 'FOR_RENT' ? rentalPeriod : undefined,
      priceVnd: String(priceNum),
      areaSqm: areaNum,
      province: province.trim(),
      district: district.trim(),
      ward: ward.trim() || undefined,
      streetAddress: streetAddress.trim() || undefined,
      images: images.length > 0 ? images : undefined,
    };

    setIsLoading(true);
    try {
      const created = await apiClient.createListing(payload);
      onSuccess(created);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi tạo tin đăng';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-listing-modal-title"
      data-testid="create-listing-modal"
    >
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden my-8">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h2
              id="create-listing-modal-title"
              className="text-lg font-bold text-[#142B4A]"
            >
              {dict.Workspace.createModal.title}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {dict.Workspace.createModal.subtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
            aria-label="Đóng"
            data-testid="create-listing-close-btn"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {errorMessage && (
            <div
              role="alert"
              className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2"
              data-testid="create-listing-error"
            >
              <span className="material-symbols-outlined text-base shrink-0 mt-0.5">
                error
              </span>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {dict.Workspace.createModal.fieldTitle} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={dict.Workspace.createModal.fieldTitlePlaceholder}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-sm text-[#142B4A] focus:outline-none focus:border-[#0F766E] focus:ring-1 focus:ring-[#0F766E]"
              data-testid="create-listing-title-input"
            />
          </div>

          {/* Transaction Type & Property Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {dict.Workspace.createModal.fieldTransactionType}
              </label>
              <select
                value={transactionType}
                onChange={(e) => setTransactionType(e.target.value as TransactionType)}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-sm text-[#142B4A] focus:outline-none focus:border-[#0F766E] bg-white"
                data-testid="create-listing-transaction-select"
              >
                <option value="FOR_SALE">Mua bán (FOR_SALE)</option>
                <option value="FOR_RENT">Cho thuê (FOR_RENT)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {dict.Workspace.createModal.fieldPropertyType}
              </label>
              <select
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value as PropertyType)}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-sm text-[#142B4A] focus:outline-none focus:border-[#0F766E] bg-white"
                data-testid="create-listing-property-type-select"
              >
                {PROPERTY_TYPES.map((pt) => (
                  <option key={pt} value={pt}>
                    {pt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Rental Period (if FOR_RENT) */}
          {transactionType === 'FOR_RENT' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {dict.Workspace.createModal.fieldRentalPeriod}
              </label>
              <select
                value={rentalPeriod}
                onChange={(e) => setRentalPeriod(e.target.value as RentalPeriod)}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-sm text-[#142B4A] focus:outline-none focus:border-[#0F766E] bg-white"
              >
                <option value="MONTH">Theo tháng (MONTH)</option>
                <option value="QUARTER">Theo quý (QUARTER)</option>
                <option value="YEAR">Theo năm (YEAR)</option>
              </select>
            </div>
          )}

          {/* Price & Area */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {dict.Workspace.createModal.fieldPrice} <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={priceVnd}
                onChange={(e) => setPriceVnd(e.target.value)}
                placeholder={dict.Workspace.createModal.fieldPricePlaceholder}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-sm text-[#142B4A] focus:outline-none focus:border-[#0F766E]"
                data-testid="create-listing-price-input"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {dict.Workspace.createModal.fieldArea} <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.1"
                min="1"
                required
                value={areaSqm}
                onChange={(e) => setAreaSqm(e.target.value)}
                placeholder={dict.Workspace.createModal.fieldAreaPlaceholder}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-sm text-[#142B4A] focus:outline-none focus:border-[#0F766E]"
                data-testid="create-listing-area-input"
              />
            </div>
          </div>

          {/* Location Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {dict.Workspace.createModal.fieldProvince}
              </label>
              <input
                type="text"
                required
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                placeholder={dict.Workspace.createModal.fieldProvincePlaceholder}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-[#142B4A] focus:outline-none focus:border-[#0F766E]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {dict.Workspace.createModal.fieldDistrict}
              </label>
              <input
                type="text"
                required
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder={dict.Workspace.createModal.fieldDistrictPlaceholder}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-[#142B4A] focus:outline-none focus:border-[#0F766E]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {dict.Workspace.createModal.fieldWard}
              </label>
              <input
                type="text"
                value={ward}
                onChange={(e) => setWard(e.target.value)}
                placeholder={dict.Workspace.createModal.fieldWardPlaceholder}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-[#142B4A] focus:outline-none focus:border-[#0F766E]"
              />
            </div>
          </div>

          {/* Street Address (Internal) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {dict.Workspace.createModal.fieldStreet}
            </label>
            <input
              type="text"
              value={streetAddress}
              onChange={(e) => setStreetAddress(e.target.value)}
              placeholder={dict.Workspace.createModal.fieldStreetPlaceholder}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-sm text-[#142B4A] focus:outline-none focus:border-[#0F766E]"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {dict.Workspace.createModal.fieldDescription} <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={4}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={dict.Workspace.createModal.fieldDescriptionPlaceholder}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-sm text-[#142B4A] focus:outline-none focus:border-[#0F766E] resize-none"
              data-testid="create-listing-description-input"
            />
          </div>

          {/* Image URLs */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {dict.Workspace.createModal.fieldImages}
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-[#142B4A] focus:outline-none focus:border-[#0F766E]"
              />
              <button
                type="button"
                onClick={handleAddImage}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
              >
                {dict.Workspace.createModal.addImage}
              </button>
            </div>
            {images.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {images.map((img, idx) => (
                  <div
                    key={idx}
                    className="relative rounded-md overflow-hidden border border-slate-200 w-16 h-12 group"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img} alt={`Img ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Xóa ảnh"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              {dict.Workspace.createModal.cancel}
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 rounded-lg bg-[#0F766E] text-white text-sm font-semibold hover:bg-[#0D655E] transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
              data-testid="create-listing-submit-btn"
            >
              {isLoading && (
                <span className="material-symbols-outlined text-base animate-spin">
                  progress_activity
                </span>
              )}
              <span>
                {isLoading
                  ? dict.Workspace.createModal.saving
                  : dict.Workspace.createModal.submitDraft}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateListingModal;

