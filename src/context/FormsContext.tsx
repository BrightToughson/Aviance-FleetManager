import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export type FormFieldDef = {
  name: string;
  label: string;
  type: 'text' | 'select' | 'number';
  options?: string[]; // for select
  required?: boolean;
};

export type CustomForm = {
  id: string;
  title: string;
  description: string;
  fields: FormFieldDef[];
  createdAt: string;
  active: boolean;
};

export type FormSubmission = {
  id: string;
  formId: string;
  submittedAt: string;
  data: Record<string, string>;
};

interface FormsContextType {
  forms: CustomForm[];
  submissions: FormSubmission[];
  loading: boolean;
  createForm: (form: Omit<CustomForm, 'id' | 'createdAt'>) => Promise<string>;
  toggleFormStatus: (id: string) => Promise<void>;
  submitForm: (formId: string, data: Record<string, string>) => Promise<void>;
  deleteForm: (formId: string) => Promise<void>;
  refreshForms: () => Promise<void>;
}

const FormsContext = createContext<FormsContextType | undefined>(undefined);

export function FormsProvider({ children }: { children: React.ReactNode }) {
  const [forms, setForms] = useState<CustomForm[]>([]);
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFormsAndSubmissions = async () => {
    setLoading(true);
    const [formsRes, subsRes] = await Promise.all([
      supabase.from('custom_forms').select('*').order('created_at', { ascending: false }),
      supabase.from('form_submissions').select('*').order('submitted_at', { ascending: false })
    ]);

    if (formsRes.error) console.error('Error fetching forms:', formsRes.error);
    else if (formsRes.data) {
      setForms(formsRes.data.map(f => ({
        id: f.id,
        title: f.title,
        description: f.description || '',
        fields: f.fields || [],
        createdAt: new Date(f.created_at).toISOString(),
        active: f.active
      })));
    }

    if (subsRes.error) console.error('Error fetching submissions:', subsRes.error);
    else if (subsRes.data) {
      setSubmissions(subsRes.data.map(s => ({
        id: s.id,
        formId: s.form_id,
        submittedAt: new Date(s.submitted_at).toISOString(),
        data: s.data || {}
      })));
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchFormsAndSubmissions();
  }, []);

  const createForm = async (form: Omit<CustomForm, 'id' | 'createdAt'>) => {
    const { data, error } = await supabase.from('custom_forms').insert([{
      title: form.title,
      description: form.description,
      fields: form.fields,
      active: form.active
    }]).select();

    if (!error && data) {
      fetchFormsAndSubmissions();
      return data[0].id;
    }
    return '';
  };

  const toggleFormStatus = async (id: string) => {
    const form = forms.find(f => f.id === id);
    if (!form) return;
    
    setForms(prev => prev.map(f => f.id === id ? { ...f, active: !f.active } : f));
    await supabase.from('custom_forms').update({ active: !form.active }).eq('id', id);
  };

  const submitForm = async (formId: string, data: Record<string, string>) => {
    const { error } = await supabase.from('form_submissions').insert([{
      form_id: formId,
      data: data
    }]);

    if (!error) {
      fetchFormsAndSubmissions();
    }
  };

  const deleteForm = async (formId: string) => {
    setForms(prev => prev.filter(f => f.id !== formId));
    setSubmissions(prev => prev.filter(s => s.formId !== formId));
    await supabase.from('custom_forms').delete().eq('id', formId);
  };

  return (
    <FormsContext.Provider value={{ forms, submissions, loading, createForm, toggleFormStatus, submitForm, deleteForm, refreshForms: fetchFormsAndSubmissions }}>
      {children}
    </FormsContext.Provider>
  );
}

export function useForms() {
  const context = useContext(FormsContext);
  if (context === undefined) {
    throw new Error('useForms must be used within a FormsProvider');
  }
  return context;
}

