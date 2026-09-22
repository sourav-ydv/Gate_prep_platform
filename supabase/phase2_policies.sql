create policy "insert lectures" on lectures for insert with check (auth.uid() = added_by);
create policy "update own lectures" on lectures for update using (auth.uid() = added_by);
create policy "delete own lectures" on lectures for delete using (auth.uid() = added_by);