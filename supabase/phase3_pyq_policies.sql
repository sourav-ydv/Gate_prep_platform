create policy "insert pyqs" on pyqs for insert with check (true);
create policy "update pyqs" on pyqs for update using (true);
create policy "delete pyqs" on pyqs for delete using (true);